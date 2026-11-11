from collections import Counter
from dataclasses import dataclass

from app.core.rules import RuleDefinition, RuleEvaluation


@dataclass(frozen=True)
class FollowupQuestion:
    feature: str
    question: str
    related_rule_ids: tuple[str, ...]


_QUESTIONS_BY_FEATURE = {
    "fat_to_flour": "What amounts did you use for the flour and fat ingredients?",
    "moisture_to_flour": "What amounts did you use for the flour and liquid ingredients?",
    "leavening_to_flour": (
        "Your ingredient list has no measured leavener. If you used one, "
        "reply with its amount and name, like '5 g baking powder' or "
        "'5 g baking soda'. Otherwise answer 'no'."
    ),
    "sweetness_to_flour": "What amounts did you use for the flour and sugar?",
}


def choose_followup_question(
    top_rule_ids: list[str],
    rules: list[RuleDefinition],
    evaluations: list[RuleEvaluation],
    limit: int = 3,
) -> FollowupQuestion | None:
    """Choose a useful question for leading unknown or zero-leavener rules."""
    rules_by_id = {rule.id: rule for rule in rules}
    evaluations_by_id = {
        evaluation.rule_id: evaluation for evaluation in evaluations
    }

    candidates: list[RuleDefinition] = []
    for rule_id in top_rule_ids[:limit]:
        rule = rules_by_id.get(rule_id)
        evaluation = evaluations_by_id.get(rule_id)

        if rule is None or evaluation is None:
            continue

        if evaluation.status == "unknown":
            candidates.append(rule)
            continue

        # A zero measured ratio may mean the recipe text omitted an ingredient.
        # Ask the cook to confirm rather than treating the omission as certain.
        if (
            evaluation.status == "fired"
            and rule.feature == "leavening_to_flour"
            and evaluation.measured_value == 0
        ):
            candidates.append(rule)

    if not candidates:
        return None

    feature_counts = Counter(rule.feature for rule in candidates)
    most_common_count = max(feature_counts.values())

    # Preserve the order of the leading rules when breaking ties.
    selected_feature = next(
        rule.feature
        for rule in candidates
        if feature_counts[rule.feature] == most_common_count
    )

    question = _QUESTIONS_BY_FEATURE.get(selected_feature)
    if question is None:
        return None

    related_rule_ids = tuple(
        rule.id for rule in candidates if rule.feature == selected_feature
    )

    return FollowupQuestion(
        feature=selected_feature,
        question=question,
        related_rule_ids=related_rule_ids,
    )