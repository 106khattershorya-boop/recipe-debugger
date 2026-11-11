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
RuleCheckStatus = Literal["fired", "unknown", "not_triggered"]
RuleCheckFeature = Literal[
    "fat_to_flour",
    "moisture_to_flour",
    "leavening_to_flour",
    "sweetness_to_flour",
]
RuleCheckOperator = Literal["lt", "lte", "gt", "gte"]


class EvidenceItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    grade: EvidenceGrade
    text: str = Field(min_length=1)
    source: str | None = None


class RuleCheck(BaseModel):
    """A matching rule screen and its measured comparison."""

    model_config = ConfigDict(extra="forbid")

    rule_id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    feature: RuleCheckFeature
    operator: RuleCheckOperator
    threshold: float
    measured_value: float | None = None
    status: RuleCheckStatus
    source: EvidenceGrade
    source_reference: str | None = None
    note: str | None = None


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
    rule_checks: list[RuleCheck] = Field(default_factory=list)
    followup_question: str | None = None
    followup_question_id: str | None = None
    followup_feature: str | None = None
    followup_rule_ids: list[str] = Field(default_factory=list)
    rule_pack_version: str = Field(min_length=1)