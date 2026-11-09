from typing import Any

from pymongo import AsyncMongoClient

from app.config import get_settings


settings = get_settings()

_client: AsyncMongoClient | None = None


async def connect_to_mongo() -> None:
    """Connect to MongoDB and verify that it responds to a ping."""
    global _client

    if _client is not None:
        return

    client = AsyncMongoClient(
        settings.mongo_uri,
        serverSelectionTimeoutMS=5000,
    )

    try:
        await client.admin.command("ping")
    except Exception:
        await client.close()
        raise

    _client = client


async def close_mongo_connection() -> None:
    """Close the shared MongoDB connection if it is open."""
    global _client

    if _client is not None:
        await _client.close()
        _client = None


def get_database() -> Any:
    """Return the configured database after a successful connection."""
    if _client is None:
        raise RuntimeError(
            "MongoDB is not connected. Call connect_to_mongo() first."
        )

    return _client[settings.mongo_database]