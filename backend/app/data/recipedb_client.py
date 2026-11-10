from collections.abc import Mapping
from typing import Any
from urllib.parse import quote

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.data.foodoscope_client import FoodoscopeAPIError, FoodoscopeClient


RECIPE_LIST_PATH = "/recipe2-api/recipe/recipesinfo"
RECIPE_FLAVOR_LINKS_PATH = "/recipe2-api/connections/links"
RECIPE_INGREDIENTS_BY_FLAVOR_PATH = (
    "/recipe2-api/ingredients/flavor/{flavor}"
)


class RecipeDBPage(BaseModel):
    model_config = ConfigDict(extra="allow")

    success: bool
    message: str
    data: list[dict[str, Any]]
    meta: dict[str, Any] = Field(default_factory=dict)


class RecipeDBIngredientFlavorPage(BaseModel):
    model_config = ConfigDict(extra="allow")

    success: bool
    message: str
    data: list[dict[str, Any]]
    meta: dict[str, Any] = Field(default_factory=dict)


class RecipeFlavorLinksResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    success: bool
    message: str | None = None


class RecipeDBClient:
    def __init__(self) -> None:
        self._client = FoodoscopeClient()

    async def get_recipe_page(
        self,
        params: Mapping[str, str | int | float | bool] | None = None,
    ) -> RecipeDBPage:
        """Fetch and validate a RecipeDB recipe-list page."""
        response = await self._client.get_json(
            RECIPE_LIST_PATH,
            params=params,
        )

        if not isinstance(response, dict):
            raise FoodoscopeAPIError(
                "RecipeDB returned an unexpected response shape."
            )

        success = response.get("success")
        if success is not True and str(success).casefold() != "true":
            message = response.get("message") or "No error message was provided."
            raise FoodoscopeAPIError(
                f"RecipeDB request was unsuccessful: {message}"
            )

        try:
            return RecipeDBPage.model_validate(response)
        except ValidationError as exc:
            raise FoodoscopeAPIError(
                "RecipeDB response did not match the verified data/meta format."
            ) from exc

    async def list_recipes(
        self,
        params: Mapping[str, str | int | float | bool] | None = None,
    ) -> list[dict[str, Any]]:
        """Return recipe records while retaining the existing route behavior."""
        page = await self.get_recipe_page(params=params)
        return page.data

    async def get_flavordb_links(
        self,
        *,
        entity_id: str | None = None,
        entity: str | None = None,
        ingredient: str | None = None,
        page: int | None = None,
        size: int | None = None,
    ) -> RecipeFlavorLinksResponse:
        """Fetch RecipeDB ingredients linked to FlavorDB entities."""
        selectors = (
            ("entity_id", entity_id),
            ("entity_alias_readable", entity),
            ("ingredient", ingredient),
        )
        params: dict[str, str | int] = {
            key: value.strip()
            for key, value in selectors
            if value is not None and value.strip()
        }

        if not params:
            raise ValueError(
                "Provide at least one of entity_id, entity, or ingredient."
            )
        if page is not None:
            if page < 1:
                raise ValueError("page must be 1 or greater.")
            params["page"] = page
        if size is not None:
            if size < 1:
                raise ValueError("size must be 1 or greater.")
            params["limit"] = size

        response = await self._client.get_json(
            RECIPE_FLAVOR_LINKS_PATH,
            params=params,
        )

        if not isinstance(response, dict):
            raise FoodoscopeAPIError(
                "RecipeDB–FlavorDB links returned an unexpected response shape."
            )

        success = response.get("success")
        if success is not True and str(success).casefold() != "true":
            message = response.get("message") or "No error message was provided."
            raise FoodoscopeAPIError(
                f"RecipeDB–FlavorDB links request was unsuccessful: {message}"
            )

        try:
            return RecipeFlavorLinksResponse.model_validate(response)
        except ValidationError as exc:
            raise FoodoscopeAPIError(
                "RecipeDB–FlavorDB links response is missing a valid success field."
            ) from exc

    async def get_ingredients_by_flavor(
        self,
        flavor: str,
        *,
        page: int = 1,
        limit: int = 10,
    ) -> RecipeDBIngredientFlavorPage:
        """Fetch ingredient records in a RecipeDB flavor category."""
        cleaned_flavor = flavor.strip()
        if not cleaned_flavor:
            raise ValueError("flavor must not be empty.")
        if page < 1:
            raise ValueError("page must be 1 or greater.")
        if not 1 <= limit <= 10:
            raise ValueError("limit must be between 1 and 10.")

        encoded_flavor = quote(cleaned_flavor, safe="")
        path = RECIPE_INGREDIENTS_BY_FLAVOR_PATH.format(
            flavor=encoded_flavor
        )
        response = await self._client.get_json(
            path,
            params={"page": page, "limit": limit},
        )

        if not isinstance(response, dict):
            raise FoodoscopeAPIError(
                "RecipeDB ingredient-flavor lookup returned an "
                "unexpected response shape."
            )

        success = response.get("success")
        if success is not True and str(success).casefold() != "true":
            message = response.get("message") or "No error message was provided."
            raise FoodoscopeAPIError(
                f"RecipeDB ingredient-flavor request was unsuccessful: {message}"
            )

        try:
            return RecipeDBIngredientFlavorPage.model_validate(response)
        except ValidationError as exc:
            raise FoodoscopeAPIError(
                "RecipeDB ingredient-flavor response did not match the "
                "verified data/meta format."
            ) from exc

    async def close(self) -> None:
        await self._client.close()

    async def __aenter__(self) -> "RecipeDBClient":
        return self

    async def __aexit__(self, exc_type: Any, exc: Any, traceback: Any) -> None:
        await self.close()