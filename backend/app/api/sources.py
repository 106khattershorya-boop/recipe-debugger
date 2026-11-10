from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.data.flavordb_client import FlavorDBClient
from app.data.foodoscope_client import FoodoscopeAPIError
from app.data.recipedb_client import RecipeDBClient


router = APIRouter(prefix="/sources", tags=["data sources"])


@router.get("/recipedb/recipes")
async def get_recipedb_recipes(
    page: int = Query(..., description="RecipeDB page number."),
    limit: int = Query(
        ...,
        ge=1,
        le=10,
        description="Number of recipes to return (1–10).",
    ),
) -> dict[str, Any]:
    try:
        async with RecipeDBClient() as client:
            recipe_page = await client.get_recipe_page(
                params={"page": page, "limit": limit}
            )
    except ValueError as exc:
        raise HTTPException(
            status_code=503,
            detail="Foodoscope API key is not configured.",
        ) from exc
    except FoodoscopeAPIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        "count": len(recipe_page.data),
        "recipes": recipe_page.data,
        "meta": recipe_page.meta,
    }


@router.get("/recipedb/flavordb-links")
async def get_recipedb_flavordb_links(
    entity_id: str | None = Query(
        default=None,
        description="FlavorDB entity ID. Supply this, entity, or ingredient.",
    ),
    entity: str | None = Query(
        default=None,
        description="FlavorDB entity name. Supply this, entity_id, or ingredient.",
    ),
    ingredient: str | None = Query(
        default=None,
        description="Ingredient name. Supply this, entity_id, or entity.",
    ),
    page: int | None = Query(
        default=None,
        ge=1,
        description="Optional result page number.",
    ),
    size: int | None = Query(
        default=None,
        ge=1,
        description="Optional number of linked results per page.",
    ),
) -> dict[str, Any]:
    if not any(
        value and value.strip()
        for value in (entity_id, entity, ingredient)
    ):
        raise HTTPException(
            status_code=422,
            detail="Provide at least one of entity_id, entity, or ingredient.",
        )

    try:
        async with RecipeDBClient() as client:
            result = await client.get_flavordb_links(
                entity_id=entity_id,
                entity=entity,
                ingredient=ingredient,
                page=page,
                size=size,
            )
    except ValueError as exc:
        raise HTTPException(
            status_code=503,
            detail="Foodoscope API key is not configured.",
        ) from exc
    except FoodoscopeAPIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return result.model_dump(mode="json")


@router.get("/recipedb/ingredients/flavor/{flavor}")
async def get_recipedb_ingredients_by_flavor(
    flavor: str,
    page: int = Query(
        default=1,
        ge=1,
        description="RecipeDB result page number.",
    ),
    limit: int = Query(
        default=5,
        ge=1,
        le=10,
        description="Number of ingredient records to return (1–10).",
    ),
) -> dict[str, Any]:
    if not flavor.strip():
        raise HTTPException(
            status_code=422,
            detail="The flavor category must not be empty.",
        )

    try:
        async with RecipeDBClient() as client:
            result = await client.get_ingredients_by_flavor(
                flavor,
                page=page,
                limit=limit,
            )
    except ValueError as exc:
        raise HTTPException(
            status_code=503,
            detail="Foodoscope API key is not configured.",
        ) from exc
    except FoodoscopeAPIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return result.model_dump(mode="json")


@router.get("/flavordb/taste-threshold")
async def get_flavordb_taste_threshold(
    values: str = Query(
        ...,
        description=(
            "One or more taste-threshold values. "
            "Use the exact value or format shown in the Foodoscope Playground."
        ),
    ),
) -> Any:
    try:
        async with FlavorDBClient() as client:
            return await client.get_taste_threshold(
                params={"values": values}
            )
    except ValueError as exc:
        raise HTTPException(
            status_code=503,
            detail="Foodoscope API key is not configured.",
        ) from exc
    except FoodoscopeAPIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc