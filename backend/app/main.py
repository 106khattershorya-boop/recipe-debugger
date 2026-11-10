import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.diagnoses import router as diagnoses_router
from app.api.feedback import router as feedback_router
from app.api.recipes import router as recipes_router
from app.api.repairs import router as repairs_router
from app.api.sources import router as sources_router
from app.config import get_settings
from app.db.mongo import (
    close_mongo_connection,
    connect_to_mongo,
    get_database,
)
from app.db.seed import seed_ingredient_roles


logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    application.state.database_ready = False
    mongo_connected = False

    try:
        await connect_to_mongo()
        mongo_connected = True

        database = get_database()
        seeded_count = await seed_ingredient_roles(database)

        application.state.database_ready = True
        logger.info(
            "MongoDB connected; seeded %s ingredient-role records.",
            seeded_count,
        )
    except Exception:
        logger.exception(
            "MongoDB startup initialization failed. "
            "The API will continue without database-backed features."
        )

    try:
        yield
    finally:
        if mongo_connected:
            await close_mongo_connection()


app = FastAPI(
    title=settings.app_name,
    description="A transparent, evidence-aware recipe troubleshooting API.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sources_router, prefix=settings.api_prefix)
app.include_router(recipes_router, prefix=settings.api_prefix)
app.include_router(diagnoses_router, prefix=settings.api_prefix)
app.include_router(repairs_router, prefix=settings.api_prefix)
app.include_router(feedback_router, prefix=settings.api_prefix)


@app.get(f"{settings.api_prefix}/health", tags=["health"])
def health_check() -> dict[str, str]:
    database_status = (
        "connected"
        if getattr(app.state, "database_ready", False)
        else "unavailable"
    )

    return {
        "status": "ok",
        "app": settings.app_name,
        "database": database_status,
    }