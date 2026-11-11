import logging
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, HTTPException, status
from pymongo.errors import PyMongoError

from app.core.parser import parse_recipe_text
from app.data.foodoscope_client import FoodoscopeAPIError
from app.data.recipedb_client import RecipeDBClient
from app.db.mongo import get_database
from app.models.recipe import Recipe
from app.models.requests import ParseRecipeRequest


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/recipes", tags=["recipes"])


def _normalize_name(value: str) -> str:
    return " ".join(value.casefold().strip().split())


def _find_exact_link(
    records: list[dict[str, Any]],
    ingredient_name: str,
) -> dict[str, str | bool] | None:
    target_name = _normalize_name(ingredient_name)

    for record in records:
        if not isinstance(record, dict):
            continue

        linked_recipe = record.get("recipe")
        linked_entity = record.get("entity")
        if not isinstance(linked_recipe, dict) or not isinstance(linked_entity, dict):
            continue

        linked_name = linked_recipe.get("ingredient")
        if not isinstance(linked_name, str):
            continue
        if _normalize_name(linked_name) != target_name:
            continue

        is_linked = record.get("isLinked", record.get("islinked")) is True
        if not is_linked:
            continue

        recipe_ingredient_id = linked_recipe.get("IngID")
        entity_id = linked_entity.get(
            "entity_id",
            linked_recipe.get("flavordb_id"),
        )
        entity_name = linked_entity.get("entity_alias_readable")
        entity_url = linked_entity.get(
            "flavordb_url",
            linked_entity.get("entity_alias_url"),
        )

        return {
            "recipedb_ingredient_id": (
                str(recipe_ingredient_id)
                if recipe_ingredient_id is not None
                else None
            ),
            "flavordb_entity_id": (
                str(entity_id) if entity_id is not None else None
            ),
            "flavordb_entity_name": (
                str(entity_name) if entity_name is not None else None
            ),
            "flavordb_entity_url": (
                str(entity_url) if entity_url is not None else None
            ),
            "flavordb_linked": True,
        }

    return None


async def _add_ingredient_links(recipe: Recipe) -> Recipe:
    warnings = list(recipe.parse_warnings)
    enriched_ingredients = []
    lookup_cache: dict[str, dict[str, str | bool] | None] = {}

    try:
        async with RecipeDBClient() as client:
            for ingredient in recipe.ingredients:
                search_name = ingredient.canonical_name or ingredient.name
                cache_key = _normalize_name(search_name)

                if cache_key not in lookup_cache:
                    try:
                        response = await client.get_flavordb_links(
                            ingredient=search_name,
                            page=1,
                            size=5,
                        )
                        response_data = response.model_dump(mode="json")
                        records = response_data.get("data", [])
                        lookup_cache[cache_key] = _find_exact_link(
                            records if isinstance(records, list) else [],
                            search_name,
                        )
                    except FoodoscopeAPIError as exc:
                        logger.warning(
                            "Ingredient cross-link lookup failed for %s: %s",
                            search_name,
                            exc,
                        )
                        lookup_cache[cache_key] = None
                        warnings.append(
                            "Foodoscope ingredient cross-links were unavailable "
                            f"for {search_name}; the recipe was saved without "
                            "that link."
                        )

                link_fields = lookup_cache[cache_key]
                if link_fields is None:
                    enriched_ingredients.append(ingredient)
                    if not any(
                        search_name in warning
                        and "cross-links" in warning
                        for warning in warnings
                    ):
                        warnings.append(
                            "No exact RecipeDB–FlavorDB link was found for "
                            f"{search_name}; the ingredient was saved without "
                            "a cross-reference."
                        )
                    continue

                enriched_ingredients.append(
                    ingredient.model_copy(update=link_fields)
                )
    except ValueError as exc:
        logger.warning("Foodoscope cross-link client unavailable: %s", exc)
        warnings.append(
            "Foodoscope ingredient cross-links were unavailable; "
            "the recipe was saved without those links."
        )
        enriched_ingredients = list(recipe.ingredients)

    return recipe.model_copy(
        update={
            "ingredients": enriched_ingredients,
            "parse_warnings": warnings,
        }
    )


@router.post("/parse", status_code=status.HTTP_201_CREATED)
async def parse_and_save_recipe(
    request: ParseRecipeRequest,
) -> dict[str, Any]:
    try:
        recipe = parse_recipe_text(
            name=request.name,
            ingredients_text=request.ingredients_text,
            steps_text=request.steps_text,
            family=request.family,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    recipe_object_id = ObjectId()
    recipe_id = str(recipe_object_id)
    recipe = recipe.model_copy(update={"recipe_id": recipe_id})
    recipe = await _add_ingredient_links(recipe)

    document = recipe.model_dump()
    document["_id"] = recipe_object_id
    document["created_at"] = datetime.now(timezone.utc)

    try:
        database = get_database()
        await database["recipes"].insert_one(document)
    except (RuntimeError, PyMongoError) as exc:
        logger.exception("Could not save parsed recipe to MongoDB.")
        raise HTTPException(
            status_code=503,
            detail="Recipe storage is unavailable. Please try again shortly.",
        ) from exc

    return {
        "recipe_id": recipe_id,
        "recipe": recipe.model_dump(mode="json"),
    }