from collections.abc import Mapping
from typing import Any

from app.data.foodoscope_client import FoodoscopeClient


TASTE_THRESHOLD_PATH = "/flavordb/properties/taste-threshold"


class FlavorDBClient:
    def __init__(self) -> None:
        self._client = FoodoscopeClient()

    async def get_taste_threshold(
        self,
        params: Mapping[str, str | int | float | bool] | None = None,
    ) -> Any:
        """Fetch taste-threshold data and preserve the API's response shape."""
        return await self._client.get_json(
            TASTE_THRESHOLD_PATH,
            params=params,
        )

    async def close(self) -> None:
        await self._client.close()

    async def __aenter__(self) -> "FlavorDBClient":
        return self

    async def __aexit__(self, exc_type: Any, exc: Any, traceback: Any) -> None:
        await self.close()