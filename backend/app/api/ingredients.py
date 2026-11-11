import logging
from typing import Any

from fastapi import APIRouter, HTTPException

from app.core.roles import resolve_ingredient


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ingredients", tags=["ingredients"])


@router.get("/{name}")
async def get_ingredient_roles(name: str) -> dict[str, Any]:
    cleaned_name = name.strip()
    if not cleaned_name:
        raise HTTPException(
            status_code=422,
            detail="Ingredient name must not be empty.",
        )

    try:
        role = resolve_ingredient(cleaned_name)
    except (FileNotFoundError, ValueError) as exc:
        logger.exception("Could not load the ingredient role table.")
        raise HTTPException(
            status_code=500,
            detail="Ingredient role data is unavailable.",
        ) from exc

    if role is None:
        raise HTTPException(
            status_code=404,
            detail=f"No role mapping was found for {cleaned_name!r}.",
        )

    return {
        "canonical": role.canonical,
        "roles": list(role.roles),
        "category": role.category,
        "source": role.source,
        "notes": role.notes,
    }