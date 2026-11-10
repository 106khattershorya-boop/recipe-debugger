from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.features import RecipeFeatures


RuleFeature = Literal[
    "fat_to_flour",
    "moisture_to_flour",
    "leavening_to_flour",
    "sweetness_to_flour",
]
RuleOperator = Literal["lt", "lte", "gt", "gte"]
RuleSource = Literal["rule_reference", "corpus", "team_heuristic"]
RuleStatus = Literal["fired", "unknown", "not_triggered", "symptom_mismatch"]


class RuleDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    family: str = Field(min_length=1)
    feature: RuleFeature
    operator: RuleOperator
    threshold: float
    symptom_ids: list[str] = Field(min_length=1)
    weight: float = Field(ge=0, le=1)
    suspect_role: str = Field(min_length=1)
    fix_template: str = Field(min_length=1)
    source: RuleSource
    source_reference: str | None = None

    @model_validator(mode="after")
    def validate_reference(self) -> "RuleDefinition":
        if self.source == "rule_reference" and not self.source_reference:
            raise ValueError(
                "Rules marked rule_reference must include source_reference."
            )
        return self


class RuleEvaluation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rule_id: str
    status: RuleStatus
    measured_value: float | None = None
    deviation: float = Field(ge=0, le=1)
    symptom_match: float = Field(ge=0, le=1)


def _triggered(value: float, operator: RuleOperator, threshold: float) -> bool:
    if operator == "lt":
        return value < threshold
    if operator == "lte":
        return value <= threshold
    if operator == "gt":
        return value > threshold
    return value >= threshold


def _deviation(value: float, threshold: float) -> float:
    """Return a bounded, heuristic distance beyond a rule threshold."""
    scale = max(abs(threshold), 1.0)
    return min(abs(value - threshold) / scale, 1.0)


def evaluate_rule(
    rule: RuleDefinition,
    features: RecipeFeatures,
    reported_symptoms: set[str],
) -> RuleEvaluation:
    matching_symptom = bool(set(rule.symptom_ids) & reported_symptoms)
    if not matching_symptom:
        return RuleEvaluation(
            rule_id=rule.id,
            status="symptom_mismatch",
            deviation=0.0,
            symptom_match=0.0,
        )

    value = features.ratios_to_flour.get(rule.feature)
    if value is None or features.ratios_are_partial:
        return RuleEvaluation(
            rule_id=rule.id,
            status="unknown",
            measured_value=value,
            deviation=0.0,
            symptom_match=1.0,
        )

    if not _triggered(value, rule.operator, rule.threshold):
        return RuleEvaluation(
            rule_id=rule.id,
            status="not_triggered",
            measured_value=value,
            deviation=0.0,
            symptom_match=1.0,
        )

    return RuleEvaluation(
        rule_id=rule.id,
        status="fired",
        measured_value=value,
        deviation=_deviation(value, rule.threshold),
        symptom_match=1.0,
    )


def evaluate_rules(
    rules: list[RuleDefinition],
    features: RecipeFeatures,
    reported_symptoms: set[str],
) -> list[RuleEvaluation]:
    """Evaluate each rule without adding or inferring rules."""
    return [
        evaluate_rule(rule, features, reported_symptoms)
        for rule in rules
    ]