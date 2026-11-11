import logging
import re
from dataclasses import asdict
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, HTTPException, status
from pydantic import ValidationError
from pymongo.errors import PyMongoError

from app.config import get_settings
from app.core.diagnostician import diagnose_recipe
from app.core.features import compute_recipe_features
from app.core.repair import apply_repair
from app.core.rule_pack import load_rule_pack
from app.core.rule_screen import compare_rule_screens, rules_for_family
from app.db.mongo import get_database
from app.llm.client import LLMClientError, explain_diagnosis
from app.models.diagnosis import SuggestedChange
from app.models.recipe import Recipe
from app.models.requests import CounterfactualRequest, DiagnoseRequest


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/diagnoses", tags=["diagnoses"])

_INGREDIENT_TARGET = re.compile(
    r"^ingredients\[(\d+)\]\.(grams|quantity)$"
)
_STEP_TARGET = re.compile(
    r"^steps\[(\d+)\]\.(duration_minutes|temperature_c)$"
)


def _current_target_value(recipe: Recipe, target: str) -> float | None:
    ingredient_match = _INGREDIENT_TARGET.fullmatch(target)
    step_match = _STEP_TARGET.fullmatch(target)

    if ingredient_match:
        index = int(ingredient_match.group(1))
        field = ingredient_match.group(2)
        if index < len(recipe.ingredients):
            value = getattr(recipe.ingredients[index], field)
            return float(value) if value is not None else None

    if step_match:
        index = int(step_match.group(1))
        field = step_match.group(2)
        if index < len(recipe.steps):
            value = getattr(recipe.steps[index], field)
            return float(value) if value is not None else None

    return None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_diagnosis(
    request: DiagnoseRequest,
) -> dict[str, Any]:
    if not ObjectId.is_valid(request.recipe_id):
        raise HTTPException(
            status_code=422,
            detail="recipe_id must be the ID returned by the recipe parse endpoint.",
        )

    try:
        database = get_database()
        recipe_document = await database["recipes"].find_one(
            {"_id": ObjectId(request.recipe_id)}
        )
    except (RuntimeError, PyMongoError) as exc:
        logger.exception("Could not load the recipe from MongoDB.")
        raise HTTPException(
            status_code=503,
            detail="Recipe storage is unavailable. Please try again shortly.",
        ) from exc

    if recipe_document is None:
        raise HTTPException(status_code=404, detail="Recipe was not found.")

    recipe_document.pop("_id", None)
    recipe_document.pop("created_at", None)

    try:
        recipe = Recipe.model_validate(recipe_document)
        rule_pack = load_rule_pack()
        result = diagnose_recipe(
            recipe=recipe,
            reported_symptoms=request.reported_symptoms,
            rule_pack=rule_pack,
        )
    except ValidationError as exc:
        logger.exception("Stored recipe or rule pack failed validation.")
        raise HTTPException(
            status_code=500,
            detail="Recipe or diagnosis rules could not be validated.",
        ) from exc
    except (FileNotFoundError, ValueError) as exc:
        logger.exception("Diagnosis could not be created.")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    warnings = list(result.warnings)
    if request.expected_result:
        warnings.append(
            "expected_result is accepted but is not yet used in diagnosis scoring."
        )
    if request.answers:
        warnings.append(
            "answers are accepted but are not yet used in diagnosis scoring."
        )

    ingredient_cross_references = [
        {
            "ingredient": ingredient.name,
            "recipedb_ingredient_id": ingredient.recipedb_ingredient_id,
            "flavordb_entity_id": ingredient.flavordb_entity_id,
            "flavordb_entity_name": ingredient.flavordb_entity_name,
            "flavordb_entity_url": ingredient.flavordb_entity_url,
            "source": "Foodoscope RecipeDB–FlavorDB cross-link",
        }
        for ingredient in recipe.ingredients
        if ingredient.flavordb_linked is True
    ]

    if ingredient_cross_references:
        warnings.append(
            "Ingredient cross-references identify linked database records; "
            "they do not establish the cause of a cooking fault."
        )

    settings = get_settings()
    llm_is_configured = all(
        (
            settings.llm_api_key,
            settings.llm_base_url,
            settings.llm_model,
        )
    )

    llm_explanation: dict[str, Any] | None = None
    if llm_is_configured and result.diagnosis.hypotheses:
        try:
            narrative = await explain_diagnosis(result.diagnosis)
            llm_explanation = narrative.model_dump(mode="json")
        except LLMClientError as exc:
            logger.warning("LLM explanation unavailable: %s", exc)
            warnings.append(
                "An LLM explanation could not be generated; "
                "the rule-based diagnosis is unchanged."
            )
    else:
        warnings.append(
            "LLM explanation is not configured or no hypotheses were produced; "
            "the rule-based diagnosis is unchanged."
        )

    response = {
        "diagnosis": result.diagnosis.model_dump(mode="json"),
        "fault_trace": result.graph.model_dump(mode="json"),
        "ingredient_cross_references": ingredient_cross_references,
        "llm_explanation": llm_explanation,
        "warnings": warnings,
    }

    diagnosis_document = {
        "_id": result.diagnosis.diagnosis_id,
        **response,
    }

    try:
        await database["diagnoses"].insert_one(diagnosis_document)
    except PyMongoError as exc:
        logger.exception("Could not save the diagnosis to MongoDB.")
        raise HTTPException(
            status_code=503,
            detail="Diagnosis storage is unavailable. Please try again shortly.",
        ) from exc

    return response


@router.get("/{diagnosis_id}")
async def get_diagnosis(
    diagnosis_id: str,
) -> dict[str, Any]:
    try:
        database = get_database()
        diagnosis_document = await database["diagnoses"].find_one(
            {"_id": diagnosis_id}
        )
    except (RuntimeError, PyMongoError) as exc:
        logger.exception("Could not load the diagnosis from MongoDB.")
        raise HTTPException(
            status_code=503,
            detail="Diagnosis storage is unavailable. Please try again shortly.",
        ) from exc

    if diagnosis_document is None:
        raise HTTPException(status_code=404, detail="Diagnosis was not found.")

    diagnosis_document.pop("_id", None)
    return diagnosis_document


@router.post("/counterfactual")
async def preview_counterfactual(
    request: CounterfactualRequest,
) -> dict[str, Any]:
    try:
        database = get_database()
        diagnosis_document = await database["diagnoses"].find_one(
            {"_id": request.diagnosis_id}
        )
    except (RuntimeError, PyMongoError) as exc:
        logger.exception("Could not load the diagnosis for what-if preview.")
        raise HTTPException(
            status_code=503,
            detail="Diagnosis storage is unavailable. Please try again shortly.",
        ) from exc

    if diagnosis_document is None:
        raise HTTPException(status_code=404, detail="Diagnosis was not found.")

    diagnosis_data = diagnosis_document.get("diagnosis")
    if not isinstance(diagnosis_data, dict):
        raise HTTPException(
            status_code=500,
            detail="The saved diagnosis has an invalid structure.",
        )

    recipe_id = diagnosis_data.get("recipe_id")
    if not isinstance(recipe_id, str) or not ObjectId.is_valid(recipe_id):
        raise HTTPException(
            status_code=500,
            detail="The saved diagnosis does not contain a valid recipe ID.",
        )

    try:
        recipe_document = await database["recipes"].find_one(
            {"_id": ObjectId(recipe_id)}
        )
    except PyMongoError as exc:
        logger.exception("Could not load the recipe for what-if preview.")
        raise HTTPException(
            status_code=503,
            detail="Recipe storage is unavailable. Please try again shortly.",
        ) from exc

    if recipe_document is None:
        raise HTTPException(status_code=404, detail="Recipe was not found.")

    recipe_document.pop("_id", None)
    recipe_document.pop("created_at", None)

    try:
        recipe = Recipe.model_validate(recipe_document)
        suggested_changes = [
            SuggestedChange(
                target=change.target,
                from_value=(
                    change.from_value
                    if change.from_value is not None
                    else _current_target_value(recipe, change.target)
                ),
                to_value=change.to_value,
                unit=change.unit,
            )
            for change in request.changes
        ]
        repair_result = apply_repair(recipe, suggested_changes)
        rule_pack = load_rule_pack()
    except (ValidationError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        logger.exception("Could not load the rule pack for what-if preview.")
        raise HTTPException(
            status_code=500,
            detail="Diagnosis rules are unavailable.",
        ) from exc

    original_features = compute_recipe_features(recipe)
    updated_features = compute_recipe_features(repair_result.recipe)

    feature_names = sorted(
        set(original_features.ratios_to_flour)
        | set(updated_features.ratios_to_flour)
    )
    feature_comparison = {
        feature_name: {
            "before": original_features.ratios_to_flour.get(feature_name),
            "after": updated_features.ratios_to_flour.get(feature_name),
        }
        for feature_name in feature_names
    }

    reported_symptoms = diagnosis_data.get("symptoms", [])
    if not isinstance(reported_symptoms, list):
        reported_symptoms = []

    applicable_rules = rules_for_family(
        recipe.family,
        rule_pack.rules,
    )
    rule_screen_comparison = compare_rule_screens(
        before=original_features,
        after=updated_features,
        rules=applicable_rules,
        reported_symptoms=[
            symptom for symptom in reported_symptoms
            if isinstance(symptom, str)
        ],
    )

    warnings = list(
        dict.fromkeys(
            [
                *original_features.warnings,
                *updated_features.warnings,
                "Rule screen changes are comparisons against the current "
                "rule pack; they are not probabilities or predictions of "
                "cooking outcomes.",
            ]
        )
    )

    return {
        "diagnosis_id": request.diagnosis_id,
        "recipe_id": recipe_id,
        "original_recipe": recipe.model_dump(mode="json"),
        "counterfactual_recipe": repair_result.recipe.model_dump(mode="json"),
        "changes": [asdict(item) for item in repair_result.diff],
        "feature_comparison": feature_comparison,
        "rule_screen_comparison": rule_screen_comparison,
        "warnings": warnings,
    }