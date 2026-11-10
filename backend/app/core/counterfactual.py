from collections import defaultdict
from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


CurveSource = Literal["rule_reference", "corpus", "team_heuristic"]
RiskDirection = Literal["increased", "decreased", "unchanged"]


class RiskPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    feature_value: float
    risk: float = Field(ge=0, le=1)


class FeatureRiskCurve(BaseModel):
    model_config = ConfigDict(extra="forbid")

    feature: str = Field(min_length=1)
    symptom_id: str = Field(min_length=1)
    points: list[RiskPoint] = Field(min_length=2)
    evidence_id: str = Field(min_length=1)
    source_grade: CurveSource
    source_reference: str | None = None

    @model_validator(mode="after")
    def validate_curve(self) -> "FeatureRiskCurve":
        values = [point.feature_value for point in self.points]
        if any(left >= right for left, right in zip(values, values[1:])):
            raise ValueError("Curve feature values must be strictly increasing.")

        if self.source_grade == "rule_reference" and not self.source_reference:
            raise ValueError(
                "Curves marked rule_reference must include source_reference."
            )

        return self


@dataclass(frozen=True)
class SymptomRiskChange:
    symptom_id: str
    risk_before: float | None
    risk_after: float | None
    direction: RiskDirection
    extrapolated: bool
    evidence_ids: tuple[str, ...]


@dataclass(frozen=True)
class CounterfactualResult:
    symptoms: tuple[SymptomRiskChange, ...]
    tradeoffs: tuple[str, ...]
    estimate_label: str


def _interpolate(curve: FeatureRiskCurve, value: float) -> tuple[float, bool]:
    points = curve.points

    if value < points[0].feature_value:
        return points[0].risk, True

    if value > points[-1].feature_value:
        return points[-1].risk, True

    for left, right in zip(points, points[1:]):
        if left.feature_value <= value <= right.feature_value:
            span = right.feature_value - left.feature_value
            fraction = (value - left.feature_value) / span
            risk = left.risk + fraction * (right.risk - left.risk)
            return risk, False

    return points[-1].risk, False


def _combine_noisy_or(risks: list[float]) -> float | None:
    if not risks:
        return None

    remaining = 1.0
    for risk in risks:
        remaining *= 1.0 - risk

    return 1.0 - remaining


def _evaluate_curves(
    feature_values: dict[str, float | None],
    curves: list[FeatureRiskCurve],
) -> dict[str, tuple[float | None, bool, tuple[str, ...]]]:
    symptom_risks: dict[str, list[float]] = defaultdict(list)
    symptom_extrapolated: dict[str, bool] = defaultdict(bool)
    symptom_evidence: dict[str, list[str]] = defaultdict(list)

    for curve in curves:
        value = feature_values.get(curve.feature)
        if value is None:
            continue

        risk, extrapolated = _interpolate(curve, value)
        symptom_risks[curve.symptom_id].append(risk)
        symptom_extrapolated[curve.symptom_id] |= extrapolated
        symptom_evidence[curve.symptom_id].append(curve.evidence_id)

    results = {}
    for symptom_id, risks in symptom_risks.items():
        results[symptom_id] = (
            _combine_noisy_or(risks),
            symptom_extrapolated[symptom_id],
            tuple(sorted(set(symptom_evidence[symptom_id]))),
        )

    return results


def evaluate_counterfactual(
    feature_values: dict[str, float | None],
    changes: dict[str, float],
    curves: list[FeatureRiskCurve],
) -> CounterfactualResult:
    """Compare supplied curve estimates before and after feature changes."""
    updated_values = dict(feature_values)
    updated_values.update(changes)

    before = _evaluate_curves(feature_values, curves)
    after = _evaluate_curves(updated_values, curves)

    symptom_ids = sorted(set(before) | set(after))
    symptom_changes: list[SymptomRiskChange] = []
    tradeoffs: list[str] = []

    for symptom_id in symptom_ids:
        before_risk, before_extra, before_evidence = before.get(
            symptom_id, (None, False, ())
        )
        after_risk, after_extra, after_evidence = after.get(
            symptom_id, (None, False, ())
        )

        if before_risk is None or after_risk is None:
            direction: RiskDirection = "unchanged"
        elif after_risk > before_risk:
            direction = "increased"
            tradeoffs.append(symptom_id)
        elif after_risk < before_risk:
            direction = "decreased"
        else:
            direction = "unchanged"

        symptom_changes.append(
            SymptomRiskChange(
                symptom_id=symptom_id,
                risk_before=before_risk,
                risk_after=after_risk,
                direction=direction,
                extrapolated=before_extra or after_extra,
                evidence_ids=tuple(
                    sorted(set(before_evidence) | set(after_evidence))
                ),
            )
        )

    return CounterfactualResult(
        symptoms=tuple(symptom_changes),
        tradeoffs=tuple(tradeoffs),
        estimate_label="Model estimate from rules, not cooked or tested.",
    )