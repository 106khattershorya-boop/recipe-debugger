from collections.abc import Iterable

from app.core.rules import RuleDefinition
from app.models.diagnosis import EvidenceItem


def user_stated_evidence(evidence_id: str, statement: str) -> EvidenceItem:
    """Represent a statement supplied or confirmed by the user."""
    cleaned_statement = statement.strip()
    if not evidence_id.strip():
        raise ValueError("Evidence ID must not be empty.")
    if not cleaned_statement:
        raise ValueError("Evidence statement must not be empty.")

    return EvidenceItem(
        id=evidence_id,
        grade="user_stated",
        text=cleaned_statement,
        source="User-provided recipe or answer",
    )


def rule_evidence(rule: RuleDefinition) -> EvidenceItem:
    """Describe the provenance of a rule without inventing a citation."""
    if rule.source == "rule_reference":
        grade = "rule_reference"
        text = f"Rule applied: {rule.title}."
        source = rule.source_reference
    elif rule.source == "corpus":
        grade = "corpus"
        text = f"Corpus-based rule applied: {rule.title}."
        source = rule.source_reference
    else:
        grade = "team_heuristic"
        text = f"Team heuristic applied: {rule.title}."
        source = f"Rule pack: {rule.family}"

    return EvidenceItem(
        id=f"evidence:{rule.id}",
        grade=grade,
        text=text,
        source=source,
    )


def retain_supported_evidence(
    evidence_items: Iterable[EvidenceItem],
    supported_ids: set[str],
) -> list[EvidenceItem]:
    """Keep only evidence items whose IDs are in the supplied allowlist."""
    return [
        item
        for item in evidence_items
        if item.id in supported_ids
    ]