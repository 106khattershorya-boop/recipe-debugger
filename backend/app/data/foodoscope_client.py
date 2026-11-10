from collections.abc import Mapping
from typing import Any

import httpx

from app.config import get_settings


class FoodoscopeAPIError(RuntimeError):
    """Raised when a Foodoscope API request fails."""


class FoodoscopeClient:
    BASE_URL = "https://api.foodoscope.com"

    def __init__(self, timeout_seconds: float = 10.0) -> None:
        api_key = get_settings().foodoscope_api_key
        if not api_key:
            raise ValueError(
                "FOODOSCOPE_API_KEY is missing from the backend environment."
            )

        self._http = httpx.AsyncClient(
            base_url=self.BASE_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            timeout=timeout_seconds,
        )

    async def get_json(
        self,
        path: str,
        params: Mapping[str, str | int | float | bool] | None = None,
    ) -> Any:
        """Send a GET request to a relative Foodoscope API path."""
        if not path.startswith("/") or path.startswith("//") or "://" in path:
            raise ValueError("Foodoscope API path must be a relative URL path.")

        try:
            response = await self._http.get(path, params=params)
        except httpx.TimeoutException as exc:
            raise FoodoscopeAPIError("Foodoscope API request timed out.") from exc
        except httpx.HTTPError as exc:
            raise FoodoscopeAPIError(
                f"Foodoscope API request failed: {type(exc).__name__}."
            ) from exc

        try:
            response_body = response.json()
        except ValueError as exc:
            raise FoodoscopeAPIError(
                "Foodoscope API returned a response that was not valid JSON."
            ) from exc

        if not response.is_success:
            message = (
                response_body.get("message")
                if isinstance(response_body, dict)
                else None
            )
            detail = f": {message}" if message else ""
            raise FoodoscopeAPIError(
                f"Foodoscope API returned HTTP {response.status_code}{detail}"
            )

        return response_body

    async def close(self) -> None:
        await self._http.aclose()

    async def __aenter__(self) -> "FoodoscopeClient":
        return self

    async def __aexit__(self, exc_type: Any, exc: Any, traceback: Any) -> None:
        await self.close()