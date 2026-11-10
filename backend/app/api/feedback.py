import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException, status
from pymongo.errors import PyMongoError

from app.db.mongo import get_database
from app.models.requests import FeedbackRequest


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def save_feedback(
    request: FeedbackRequest,
) -> dict[str, Any]:
    try:
        database = get_database()
        diagnosis_exists = await database["diagnoses"].find_one(
            {"_id": request.diagnosis_id},
            {"_id": 1},
        )
    except (RuntimeError, PyMongoError) as exc:
        logger.exception("Could not verify the diagnosis for feedback.")
        raise HTTPException(
            status_code=503,
            detail="Diagnosis storage is unavailable. Please try again shortly.",
        ) from exc

    if diagnosis_exists is None:
        raise HTTPException(
            status_code=404,
            detail="Diagnosis was not found.",
        )

    feedback_id = str(uuid4())
    created_at = datetime.now(timezone.utc)

    feedback_document = {
        "_id": feedback_id,
        "diagnosis_id": request.diagnosis_id,
        "outcome": request.outcome,
        "note": request.note,
        "created_at": created_at,
    }

    try:
        await database["feedback"].insert_one(feedback_document)
    except PyMongoError as exc:
        logger.exception("Could not save diagnosis feedback.")
        raise HTTPException(
            status_code=503,
            detail="Feedback storage is unavailable. Please try again shortly.",
        ) from exc

    return {
        "feedback_id": feedback_id,
        "diagnosis_id": request.diagnosis_id,
        "outcome": request.outcome,
        "note": request.note,
        "created_at": created_at.isoformat(),
    }