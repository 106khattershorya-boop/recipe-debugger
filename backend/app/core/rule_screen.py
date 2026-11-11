from dataclasses import asdict, dataclass

from app.core.features import RecipeFeatures
from app.core.rules import RuleDefinition, evaluate_rule


@dataclass(frozen=True)
class RuleScreenChange:
    rule_id: str
    title: str
    feature: str
    source: str
    source_reference: str | None
    measured_before: float | None
    measured_after: float | None
    status_before: str
    status_after: str
    change: str


def _normalize_family(value: str) -> str:
    return " ".join(value.casefold().strip().replace("-", " ").split())


def rules_for_family(
    recipe_family: str | None,
    rules: list[RuleDefinition],
) -> list[RuleDefinition]:
    """Keep only general rules and rules matching the recipe family."""
    general_families = {"general", "*"}
    normalized_family = (
        _normalize_family(recipe_family) if recipe_family else ""
    )

    return [
        rule
        for rule in rules
        if (
            _normalize_family(rule.family) in general_families
            or (
                normalized_family
                and _normalize_family(rule.family) == normalized_family
            )
        )
    ]


def compare_rule_screens(
    before: RecipeFeatures,
    after: RecipeFeatures,
    rules: list[RuleDefinition],
    reported_symptoms: list[str],
) -> list[dict[str, object]]:
    """Compare existing symptom-matched rules without predicting outcomes."""
    symptoms = {symptom.strip().casefold() for symptom in reported_symptoms}
    comparisons: list[dict[str, object]] = []

    for rule in rules:
        if not symptoms.intersection(rule.symptom_ids):
            continue

        before_result = evaluate_rule(rule, before, symptoms)
        after_result = evaluate_rule(rule, after, symptoms)

        if before_result.status == "unknown" or after_result.status == "unknown":
            change = "indeterminate"
        elif before_result.status == "fired" and after_result.status != "fired":
            change = "screen_deactivated"
        elif before_result.status != "fired" and after_result.status == "fired":
            change = "screen_activated"
        else:
            change = "unchanged"

        item = RuleScreenChange(
            rule_id=rule.id,
            title=rule.title,
            feature=rule.feature,
            source=rule.source,
            source_reference=rule.source_reference,
            measured_before=before_result.measured_value,
            measured_after=after_result.measured_value,
            status_before=before_result.status,
            status_after=after_result.status,
            change=change,
        )
        comparisons.append(asdict(item))

    return comparisons