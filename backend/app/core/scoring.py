from dataclasses import dataclass


@dataclass(frozen=True)
class CandidateScoreInput:
    candidate_id: str
    rule_id: str
    rule_weight: float
    deviation: float
    symptom_match: float
    evidence_completeness: float


@dataclass(frozen=True)
class ScoredCandidate:
    candidate_id: str
    rule_id: str
    raw_score: float
    relative_share: float
    evidence_completeness: float


def _validate_candidate(candidate: CandidateScoreInput) -> None:
    if not candidate.candidate_id.strip():
        raise ValueError("Candidate ID must not be empty.")

    if not candidate.rule_id.strip():
        raise ValueError("Rule ID must not be empty.")

    if candidate.rule_weight < 0:
        raise ValueError("Rule weight must be zero or greater.")

    for field_name, value in (
        ("deviation", candidate.deviation),
        ("symptom_match", candidate.symptom_match),
        ("evidence_completeness", candidate.evidence_completeness),
    ):
        if not 0 <= value <= 1:
            raise ValueError(f"{field_name} must be between 0 and 1.")


def score_candidates(
    candidates: list[CandidateScoreInput],
) -> list[ScoredCandidate]:
    """Score candidates and normalize their scores into relative shares."""
    for candidate in candidates:
        _validate_candidate(candidate)

    raw_scores = [
        candidate.rule_weight
        * candidate.deviation
        * candidate.symptom_match
        for candidate in candidates
    ]
    total_score = sum(raw_scores)

    scored = []
    for candidate, raw_score in zip(candidates, raw_scores):
        relative_share = raw_score / total_score if total_score > 0 else 0.0
        scored.append(
            ScoredCandidate(
                candidate_id=candidate.candidate_id,
                rule_id=candidate.rule_id,
                raw_score=raw_score,
                relative_share=relative_share,
                evidence_completeness=candidate.evidence_completeness,
            )
        )

    return sorted(
        scored,
        key=lambda item: item.relative_share,
        reverse=True,
    )


def should_ask_followup(
    scored_candidates: list[ScoredCandidate],
    share_gap_threshold: float = 0.15,
    completeness_threshold: float = 0.7,
) -> bool:
    """Return whether the leading candidates warrant a clarifying question."""
    if not scored_candidates:
        return False

    top_candidate = scored_candidates[0]
    if top_candidate.evidence_completeness < completeness_threshold:
        return True

    if len(scored_candidates) < 2:
        return False

    share_gap = (
        top_candidate.relative_share
        - scored_candidates[1].relative_share
    )
    return share_gap <= share_gap_threshold