import logging
import re
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pydantic import ValidationError
from pymongo.errors import PyMongoError

from app.config import get_settings
from app.core.diagnostician import diagnose_recipe
from app.core.roles import resolve_ingredient
from app.core.rule_pack import load_rule_pack
from app.db.mongo import get_database
from app.llm.client import LLMClientError, explain_diagnosis
from app.models.diagnosis import Diagnosis, EvidenceItem
from app.models.recipe import Recipe, RecipeIngredient
from app.models.requests import FollowupAnswerRequest


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/diagnoses", tags=["diagnoses"])

_LEAVENER_ANSWER = re.compile(
    r"^\s*(?P<amount>\d+(?:\.\d+)?)\s*g\s+"
    r"(?P<name>baking powder|baking soda)\s*$",
    flags=re.IGNORECASE,
)

_NO_ANSWERS = {"no", "no leavener", "did not use one", "didn't use one"}


def _parse_leavener_answer(
    value: str | float | bool,
) -> tuple[str | None, float | None, str]:
    """Interpret an explicit no or a gram amount with the leavener name."""
    if isinstance(value, bool):
        if value is False:
            return None, None, "User confirmed that no leavener was used."
        raise ValueError(
            "If you used a leavener, provide its amount and name, "
            "for example '5 g baking powder'."
        )

    if isinstance(value, (int, float)):
        raise ValueError(
            "Include both the amount in grams and the leavener name, "
            "for example '5 g baking soda'."
        )

    cleaned = value.strip()
    if cleaned.casefold() in _NO_ANSWERS:
        return None, None, "User confirmed that no leavener was used."

    match = _LEAVENER_ANSWER.fullmatch(cleaned)
    if match is None:
        raise ValueError(
            "Use 'no' or provide an amount in grams and its name, "
            "for example '5 g baking powder' or '5 g baking soda'."
        )

    amount = float(match.group("amount"))
    if amount <= 0:
        raise ValueError("Leavener amount must be greater than zero.")

    name = match.group("name").casefold()
    return name, amount, f"User reported {amount:g} g of {name}."


def _add_or_update_leavener(
    recipe: Recipe,
    name: str,
    amount_g: float,
) -> Recipe:
    """Apply the user's confirmed leavener amount to the saved recipe."""
    ingredient = RecipeIngredient(
        name=name,
        raw_quantity=f"{amount_g:g}",
        quantity=amount_g,
        unit="g",
        grams=amount_g,
    )
    ingredients = list(recipe.ingredients)

    for index, existing in enumerate(ingredients):
        role = resolve_ingredient(existing.canonical_name or existing.name)
        if role is not None and "leavening" in role.roles:
            ingredients[index] = existing.model_copy(
                update={
                    "name": name,
                    "raw_quantity": f"{amount_g:g}",
                    "quantity": amount_g,
                    "unit": "g",
                    "canonical_name": None,
                    "grams": amount_g,
                    "recipedb_ingredient_id": None,
                    "flavordb_entity_id": None,
                    "flavordb_entity_name": None,
                    "flavordb_entity_url": None,
                    "flavordb_linked": None,
                }
            )
            return recipe.model_copy(update={"ingredients": ingredients})

    ingredients.append(ingredient)
    return recipe.model_copy(update={"ingredients": ingredients})


@router.post("/{diagnosis_id}/answer")
async def answer_diagnosis_followup(
    diagnosis_id: str,
    request: FollowupAnswerRequest,
) -> dict[str, Any]:
    try:
        database = get_database()
        diagnosis_document = await database["diagnoses"].find_one(
            {"_id": diagnosis_id}
        )
    except (RuntimeError, PyMongoError) as exc:
        logger.exception("Could not load diagnosis for follow-up answer.")
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

    try:
        diagnosis = Diagnosis.model_validate(diagnosis_data)
    except ValidationError as exc:
        raise HTTPException(
            status_code=500,
            detail="The saved diagnosis could not be validated.",
        ) from exc

    if not diagnosis.followup_question_id:
        raise HTTPException(
            status_code=409,
            detail="This diagnosis has no unanswered follow-up question.",
        )

    if request.question_id != diagnosis.followup_question_id:
        raise HTTPException(
            status_code=409,
            detail="question_id does not match the diagnosis follow-up.",
        )

    if diagnosis.followup_feature != "leavening_to_flour":
        raise HTTPException(
            status_code=501,
            detail="Answer handling is not yet available for this question type.",
        )

    try:
        leavener_name, amount_g, answer_text = _parse_leavener_answer(
            request.value
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    recipe_id = diagnosis.recipe_id
    if not ObjectId.is_valid(recipe_id):
        raise HTTPException(
            status_code=500,
            detail="The saved diagnosis does not contain a valid recipe ID.",
        )

    try:
        recipe_document = await database["recipes"].find_one(
            {"_id": ObjectId(recipe_id)}
        )
    except PyMongoError as exc:
        logger.exception("Could not load recipe for follow-up answer.")
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
        if leavener_name is not None and amount_g is not None:
            recipe = _add_or_update_leavener(
                recipe,
                name=leavener_name,
                amount_g=amount_g,
            )

        result = diagnose_recipe(
            recipe=recipe,
            reported_symptoms=diagnosis.symptoms,
            rule_pack=load_rule_pack(),
        )
    except (ValidationError, FileNotFoundError, ValueError) as exc:
        logger.exception("Could not recalculate diagnosis after follow-up.")
        raise HTTPException(
            status_code=500,
            detail="The diagnosis could not be recalculated.",
        ) from exc

    answer_evidence = EvidenceItem(
        id=f"followup:{request.question_id}:answer",
        grade="user_stated",
        text=answer_text,
        source="User-provided follow-up answer",
    )
    updated_hypotheses = [
        hypothesis.model_copy(
            update={
                "evidence": [*hypothesis.evidence, answer_evidence]
                if hypothesis.rule_id in diagnosis.followup_rule_ids
                else hypothesis.evidence
            }
        )
        for hypothesis in result.diagnosis.hypotheses
    ]

    updated_diagnosis = result.diagnosis.model_copy(
        update={
            "diagnosis_id": diagnosis_id,
            "hypotheses": updated_hypotheses,
            "followup_question": None,
            "followup_question_id": None,
            "followup_feature": None,
            "followup_rule_ids": [],
        }
    )

    cross_references = [
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

    warnings = list(result.warnings)
    warnings.append(
        "The follow-up answer is user-stated information; it has not been "
        "independently verified."
    )

    settings = get_settings()
    llm_explanation: dict[str, Any] | None = None
    llm_is_configured = all(
        (settings.llm_api_key, settings.llm_base_url, settings.llm_model)
    )

    if llm_is_configured and updated_diagnosis.hypotheses:
        try:
            narrative = await explain_diagnosis(updated_diagnosis)
            llm_explanation = narrative.model_dump(mode="json")
        except LLMClientError as exc:
            logger.warning(
                "LLM explanation unavailable after follow-up: %s",
                exc,
            )
            warnings.append(
                "An LLM explanation could not be generated; "
                "the rule-based diagnosis is unchanged."
            )
    else:
        warnings.append(
            "LLM explanation is not configured or no hypotheses were produced."
        )

    response = {
        "diagnosis": updated_diagnosis.model_dump(mode="json"),
        "fault_trace": result.graph.model_dump(mode="json"),
        "ingredient_cross_references": cross_references,
        "followup_answer": {
            "question_id": request.question_id,
            "value": request.value,
            "evidence_id": answer_evidence.id,
        },
        "llm_explanation": llm_explanation,
        "warnings": warnings,
    }

    try:
        if leavener_name is not None:
            await database["recipes"].update_one(
                {"_id": ObjectId(recipe_id)},
                {"$set": recipe.model_dump()},
            )

        await database["diagnoses"].update_one(
            {"_id": diagnosis_id},
            {"$set": response},
        )
    except PyMongoError as exc:
        logger.exception("Could not save follow-up answer and updated diagnosis.")
        raise HTTPException(
            status_code=503,
            detail="The follow-up result could not be saved.",
        ) from exc

    return response