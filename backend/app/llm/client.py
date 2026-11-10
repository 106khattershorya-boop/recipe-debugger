import asyncio
import json
from typing import Any
from urllib.parse import quote

import httpx
from pydantic import ValidationError

from app.config import get_settings
from app.llm.prompts import build_diagnosis_narrative_messages
from app.llm.schemas import (
    DiagnosisNarrative,
    validate_narrative_support,
)
from app.models.diagnosis import Diagnosis


class LLMClientError(RuntimeError):
    """Raised when Gemini cannot return a valid diagnosis narrative."""


_TRANSIENT_STATUS_CODES = {429, 500, 502, 503, 504}
_MAX_ATTEMPTS = 3


_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "diagnosis_id": {"type": "STRING"},
        "hypotheses": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "hypothesis_id": {"type": "STRING"},
                    "explanation": {"type": "STRING"},
                    "evidence_ids": {
                        "type": "ARRAY",
                        "items": {"type": "STRING"},
                    },
                    "uncertainty_note": {"type": "STRING"},
                    "suggested_followup": {
                        "type": "STRING",
                        "nullable": True,
                    },
                },
                "required": [
                    "hypothesis_id",
                    "explanation",
                    "evidence_ids",
                    "uncertainty_note",
                    "suggested_followup",
                ],
            },
        },
    },
    "required": ["diagnosis_id", "hypotheses"],
}


def _provider_error_detail(response: httpx.Response, api_key: str) -> str:
    """Extract a short provider error message without exposing the API key."""
    try:
        body = response.json()
    except ValueError:
        body = None

    detail: object = None
    if isinstance(body, dict):
        error = body.get("error")
        if isinstance(error, dict):
            detail = error.get("message") or error.get("detail")
        elif isinstance(error, str):
            detail = error
        else:
            detail = body.get("message") or body.get("detail")

    if not isinstance(detail, str) or not detail.strip():
        detail = response.text.strip() or "No error details were returned."

    safe_detail = detail.replace(api_key, "[redacted]") if api_key else detail
    return safe_detail[:500]


def _retry_delay(response: httpx.Response, attempt: int) -> float:
    """Use a short provider retry hint, or a small exponential delay."""
    retry_after = response.headers.get("Retry-After")
    if retry_after:
        try:
            return min(max(float(retry_after), 0.0), 5.0)
        except ValueError:
            pass

    return min(0.8 * (2**attempt), 3.2)


async def explain_diagnosis(diagnosis: Diagnosis) -> DiagnosisNarrative:
    """Request and validate an explanation for an existing diagnosis."""
    settings = get_settings()

    if not settings.llm_api_key:
        raise LLMClientError("LLM_API_KEY is not configured.")
    if not settings.llm_base_url:
        raise LLMClientError("LLM_BASE_URL is not configured.")
    if not settings.llm_model:
        raise LLMClientError("LLM_MODEL is not configured.")
    if not diagnosis.hypotheses:
        raise LLMClientError(
            "Cannot generate a narrative when the diagnosis has no hypotheses."
        )

    base_url = settings.llm_base_url.rstrip("/")
    if base_url.endswith("/openai"):
        base_url = base_url.removesuffix("/openai")

    model = quote(settings.llm_model, safe="-._")
    endpoint = f"{base_url}/models/{model}:generateContent"
    headers = {
        "x-goog-api-key": settings.llm_api_key,
        "Content-Type": "application/json",
    }

    messages = build_diagnosis_narrative_messages(diagnosis)
    payload: dict[str, Any] = {
        "systemInstruction": {
            "parts": [{"text": messages[0]["content"]}],
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": messages[1]["content"]}],
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": _RESPONSE_SCHEMA,
            "temperature": 0.2,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response: httpx.Response | None = None

            for attempt in range(_MAX_ATTEMPTS):
                response = await client.post(
                    endpoint,
                    headers=headers,
                    json=payload,
                )

                should_retry = (
                    response.status_code in _TRANSIENT_STATUS_CODES
                    and attempt < _MAX_ATTEMPTS - 1
                )
                if not should_retry:
                    break

                await asyncio.sleep(_retry_delay(response, attempt))

    except httpx.TimeoutException as exc:
        raise LLMClientError("The Gemini request timed out.") from exc
    except httpx.RequestError as exc:
        raise LLMClientError("Could not connect to Gemini.") from exc

    if response is None:
        raise LLMClientError("Gemini did not return a response.")

    if response.is_error:
        detail = _provider_error_detail(response, settings.llm_api_key)
        raise LLMClientError(
            f"Gemini returned HTTP {response.status_code}: {detail}"
        )

    try:
        response_body = response.json()
        content = response_body["candidates"][0]["content"]["parts"][0]["text"]
    except (ValueError, TypeError, KeyError, IndexError) as exc:
        raise LLMClientError(
            "Gemini response did not contain candidate text in the expected format."
        ) from exc

    if not isinstance(content, str):
        raise LLMClientError("Gemini candidate text was not a string.")

    try:
        narrative_data = json.loads(content)
    except json.JSONDecodeError as exc:
        raise LLMClientError(
            f"Gemini returned malformed JSON near character {exc.pos}."
        ) from exc

    try:
        narrative = DiagnosisNarrative.model_validate(narrative_data)
    except ValidationError as exc:
        issues = [
            f"{'.'.join(str(part) for part in issue['loc'])}: {issue['msg']}"
            for issue in exc.errors(include_input=False)[:3]
        ]
        summary = "; ".join(issues) or "response did not match the schema"
        raise LLMClientError(
            f"Gemini narrative failed schema validation: {summary}"
        ) from exc

    try:
        validate_narrative_support(narrative, diagnosis)
    except ValueError as exc:
        raise LLMClientError(
            f"Gemini narrative failed evidence validation: {exc}"
        ) from exc

    return narrative