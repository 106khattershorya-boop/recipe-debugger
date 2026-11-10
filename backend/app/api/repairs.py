import logging
import re
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from bson import ObjectId
from fastapi import APIRouter, HTTPException, status
from pydantic import ValidationError
from pymongo.errors import PyMongoError

from app.core.features import compute_recipe_features
from app.core.repair import apply_repair
from app.db.mongo import get_database
from app.models.diagnosis import SuggestedChange
from app.models.recipe import Recipe
from app.models.requests import CounterfactualRequest


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/repairs", tags=["repairs"])

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
async def save_repaired_recipe(
    request: CounterfactualRequest,
) -> dict[str, Any]:
    try:
        database = get_database()
        diagnosis_document = await database["diagnoses"].find_one(
            {"_id": request.diagnosis_id}
        )
    except (RuntimeError, PyMongoError) as exc:
        logger.exception("Could not load the diagnosis for repair.")
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
        logger.exception("Could not load the recipe for repair.")
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
        reasons = {
            change.target: "User-selected change from the what-if preview."
            for change in request.changes
        }
        repair_result = apply_repair(
            recipe,
            suggested_changes,
            reasons=reasons,
        )
    except (ValidationError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    original_features = compute_recipe_features(recipe)
    repaired_features = compute_recipe_features(repair_result.recipe)

    feature_names = sorted(
        set(original_features.ratios_to_flour)
        | set(repaired_features.ratios_to_flour)
    )
    feature_comparison = {
        feature_name: {
            "before": original_features.ratios_to_flour.get(feature_name),
            "after": repaired_features.ratios_to_flour.get(feature_name),
        }
        for feature_name in feature_names
    }

    repair_id = str(uuid4())
    warnings = list(
        dict.fromkeys(
            [
                *original_features.warnings,
                *repaired_features.warnings,
                "This saved repair reflects user-selected changes; "
                "its cooking outcome has not been tested.",
            ]
        )
    )

    response = {
        "repair_id": repair_id,
        "diagnosis_id": request.diagnosis_id,
        "source_recipe_id": recipe_id,
        "original_recipe": recipe.model_dump(mode="json"),
        "repaired_recipe": repair_result.recipe.model_dump(mode="json"),
        "changes": [asdict(item) for item in repair_result.diff],
        "feature_comparison": feature_comparison,
        "warnings": warnings,
    }

    repair_document = {
        "_id": repair_id,
        **response,
        "created_at": datetime.now(timezone.utc),
    }

    try:
        await database["repairs"].insert_one(repair_document)
    except PyMongoError as exc:
        logger.exception("Could not save the repaired recipe to MongoDB.")
        raise HTTPException(
            status_code=503,
            detail="Repair storage is unavailable. Please try again shortly.",
        ) from exc

    return response


@router.get("/{repair_id}")
async def get_repair(
    repair_id: str,
) -> dict[str, Any]:
    try:
        database = get_database()
        repair_document = await database["repairs"].find_one(
            {"_id": repair_id}
        )
    except (RuntimeError, PyMongoError) as exc:
        logger.exception("Could not load the repair from MongoDB.")
        raise HTTPException(
            status_code=503,
            detail="Repair storage is unavailable. Please try again shortly.",
        ) from exc

    if repair_document is None:
        raise HTTPException(status_code=404, detail="Repair was not found.")

    repair_document.pop("_id", None)
    return repair_document