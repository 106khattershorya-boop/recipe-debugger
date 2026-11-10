from pydantic import BaseModel, ConfigDict, Field

from app.models.diagnosis import Diagnosis


class HypothesisNarrative(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hypothesis_id: str = Field(min_length=1)
    explanation: str = Field(min_length=1, max_length=500)
    evidence_ids: list[str] = Field(min_length=1)
    uncertainty_note: str = Field(min_length=1, max_length=300)
    suggested_followup: str | None = Field(default=None, max_length=300)


class DiagnosisNarrative(BaseModel):
    model_config = ConfigDict(extra="forbid")

    diagnosis_id: str = Field(min_length=1)
    hypotheses: list[HypothesisNarrative] = Field(min_length=1)


def validate_narrative_support(
    narrative: DiagnosisNarrative,
    diagnosis: Diagnosis,
) -> None:
    """Reject mismatched hypotheses or evidence not attached to that hypothesis."""
    if narrative.diagnosis_id != diagnosis.diagnosis_id:
        raise ValueError("Narrative diagnosis_id does not match the diagnosis.")

    hypotheses_by_id = {
        hypothesis.id: hypothesis
        for hypothesis in diagnosis.hypotheses
    }
    narrative_ids = [item.hypothesis_id for item in narrative.hypotheses]

    if len(narrative_ids) != len(set(narrative_ids)):
        raise ValueError("Narrative contains duplicate hypothesis IDs.")

    if set(narrative_ids) != set(hypotheses_by_id):
        raise ValueError(
            "Narrative hypothesis IDs must exactly match the diagnosis."
        )

    for item in narrative.hypotheses:
        hypothesis = hypotheses_by_id[item.hypothesis_id]
        allowed_evidence_ids = {
            evidence.id for evidence in hypothesis.evidence
        }

        if not set(item.evidence_ids).issubset(allowed_evidence_ids):
            raise ValueError(
                f"Narrative for {item.hypothesis_id!r} cites unsupported "
                "evidence IDs."
            )