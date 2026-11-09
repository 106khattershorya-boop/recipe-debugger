from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


EvidenceGrade = Literal[
    "rule_reference",
    "corpus",
    "user_stated",
    "model_knowledge",
    "team_heuristic",
]

ConfidenceLabel = Literal["low", "medium", "high"]


class EvidenceItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    grade: EvidenceGrade
    text: str = Field(min_length=1)
    source: str | None = None


class Suspect(BaseModel):
    model_config = ConfigDict(extra="forbid")

    node_id: str = Field(min_length=1)
    kind: Literal["ingredient", "operation", "intermediate"]


class SuggestedChange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target: str = Field(min_length=1)
    from_value: str | float | None = None
    to_value: str | float | None = None
    unit: str | None = None


class Hypothesis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    suspect: Suspect
    rule_id: str = Field(min_length=1)
    share: float = Field(ge=0, le=1)
    confidence_label: ConfidenceLabel
    evidence: list[EvidenceItem] = Field(default_factory=list)
    uncertainty: str | None = None
    fix: SuggestedChange | None = None


class Diagnosis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    diagnosis_id: str = Field(min_length=1)
    recipe_id: str = Field(min_length=1)
    symptoms: list[str] = Field(min_length=1)
    hypotheses: list[Hypothesis] = Field(default_factory=list)
    followup_question: str | None = None
    rule_pack_version: str = Field(min_length=1)