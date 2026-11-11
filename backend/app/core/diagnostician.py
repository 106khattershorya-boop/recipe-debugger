from dataclasses import dataclass
from uuid import uuid4

from app.core.evidence import rule_evidence, user_stated_evidence
from app.core.features import RecipeFeatures, compute_recipe_features
from app.core.followup import choose_followup_question
from app.core.graph import build_recipe_graph
from app.core.roles import resolve_ingredient
from app.core.rules import RuleEvaluation, evaluate_rules
from app.core.rule_pack import RulePack
from app.core.scoring import CandidateScoreInput, score_candidates
from app.models.diagnosis import (
    Diagnosis,
    Hypothesis,
    RuleCheck,
    Suspect,
)
from app.models.graph import GraphEdge, GraphNode, RecipeGraph
from app.models.recipe import Recipe


@dataclass(frozen=True)
class DiagnosisResult:
    diagnosis: Diagnosis
    graph: RecipeGraph
    warnings: tuple[str, ...]


def _normalize_family(value: str) -> str:
    """Normalize family labels for consistent matching."""
    return " ".join(value.casefold().strip().replace("-", " ").split())


def _rules_for_family(
    recipe_family: str | None,
    rule_pack: RulePack,
):
    """Select only matching family rules and explicitly general rules."""
    general_families = {"general", "*"}
    normalized_recipe_family = (
        _normalize_family(recipe_family) if recipe_family else ""
    )

    return [
        rule
        for rule in rule_pack.rules
        if (
            _normalize_family(rule.family) in general_families
            or (
                normalized_recipe_family
                and _normalize_family(rule.family) == normalized_recipe_family
            )
        )
    ]


def diagnose_recipe(
    recipe: Recipe,
    reported_symptoms: list[str],
    rule_pack: RulePack,
) -> DiagnosisResult:
    """Build evidence-aware hypotheses and matching rule checks."""
    if not recipe.recipe_id:
        raise ValueError("The recipe must be saved before diagnosis.")

    symptoms = [symptom.strip().casefold() for symptom in reported_symptoms]
    symptoms = [symptom for symptom in symptoms if symptom]
    if not symptoms:
        raise ValueError("At least one non-empty symptom is required.")

    features: RecipeFeatures = compute_recipe_features(recipe)
    applicable_rules = _rules_for_family(recipe.family, rule_pack)
    evaluations = evaluate_rules(
        applicable_rules,
        features,
        set(symptoms),
    )

    rules_by_id = {rule.id: rule for rule in applicable_rules}
    evaluations_by_id = {
        evaluation.rule_id: evaluation for evaluation in evaluations
    }

    rule_checks = []
    for rule in applicable_rules:
        evaluation = evaluations_by_id[rule.id]
        if evaluation.status == "symptom_mismatch":
            continue

        note = None
        if evaluation.status == "unknown":
            if evaluation.measured_value is None:
                note = "The required ratio could not be calculated."
            else:
                note = (
                    "Some ingredient amounts or roles are unknown; "
                    "the measured ratio may be partial."
                )

        rule_checks.append(
            RuleCheck(
                rule_id=rule.id,
                title=rule.title,
                feature=rule.feature,
                operator=rule.operator,
                threshold=rule.threshold,
                measured_value=evaluation.measured_value,
                status=evaluation.status,
                source=rule.source,
                source_reference=rule.source_reference,
                note=note,
            )
        )

    fired_evaluations = [
        evaluation
        for evaluation in evaluations
        if evaluation.status == "fired"
    ]
    scored_candidates = score_candidates(
        [
            CandidateScoreInput(
                candidate_id=evaluation.rule_id,
                rule_id=evaluation.rule_id,
                rule_weight=rules_by_id[evaluation.rule_id].weight,
                deviation=evaluation.deviation,
                symptom_match=evaluation.symptom_match,
                evidence_completeness=1.0,
            )
            for evaluation in fired_evaluations
        ]
    )

    symptom_evidence = [
        user_stated_evidence(
            evidence_id=f"symptom:{index}",
            statement=f"Reported symptom: {symptom}",
        )
        for index, symptom in enumerate(symptoms, start=1)
    ]

    hypotheses: list[Hypothesis] = []
    graph = build_recipe_graph(recipe, symptoms)
    graph_nodes = list(graph.nodes)
    graph_edges = list(graph.edges)
    known_node_ids = {node.id for node in graph_nodes}

    for evaluation in scored_candidates:
        rule = rules_by_id[evaluation.rule_id]
        rule_evaluation: RuleEvaluation = evaluations_by_id[rule.id]
        ratio_node_id = f"ratio_{rule.feature}"

        if ratio_node_id not in known_node_ids:
            measured = rule_evaluation.measured_value
            measured_text = (
                f"{measured:.3f}" if measured is not None else "unknown"
            )
            graph_nodes.append(
                GraphNode(
                    id=ratio_node_id,
                    type="intermediate",
                    label=f"{rule.feature} ratio: {measured_text}",
                    roles=[rule.suspect_role],
                )
            )
            known_node_ids.add(ratio_node_id)

        rule_item = rule_evidence(rule)
        ratio_roles = {rule.suspect_role, "flour_base"}

        for ingredient_index, ingredient in enumerate(
            recipe.ingredients,
            start=1,
        ):
            lookup_name = ingredient.canonical_name or ingredient.name
            role_entry = resolve_ingredient(lookup_name)

            if (
                role_entry is None
                and ingredient.flavordb_linked is True
                and ingredient.flavordb_entity_name
            ):
                role_entry = resolve_ingredient(
                    ingredient.flavordb_entity_name
                )

            if (
                role_entry is not None
                and ratio_roles.intersection(role_entry.roles)
            ):
                graph_edges.append(
                    GraphEdge(
                        source_id=f"ingredient_{ingredient_index}",
                        target_id=ratio_node_id,
                        kind="RATIO",
                        rule_id=rule.id,
                        weight=evaluation.relative_share,
                        active=True,
                        evidence_ids=[rule_item.id],
                    )
                )

        for symptom_index, symptom in enumerate(symptoms, start=1):
            if symptom in rule.symptom_ids:
                graph_edges.append(
                    GraphEdge(
                        source_id=ratio_node_id,
                        target_id=f"symptom_{symptom_index}",
                        kind="AFFECTS",
                        rule_id=rule.id,
                        weight=evaluation.relative_share,
                        active=True,
                        evidence_ids=[rule_item.id],
                    )
                )

        if rule.source == "team_heuristic":
            confidence_label = "low"
            uncertainty = (
                "This is a provisional team heuristic, not a validated "
                "universal standard."
            )
        else:
            confidence_label = "medium"
            uncertainty = None

        hypotheses.append(
            Hypothesis(
                id=f"hypothesis:{rule.id}",
                title=rule.title,
                suspect=Suspect(
                    node_id=ratio_node_id,
                    kind="intermediate",
                ),
                rule_id=rule.id,
                share=evaluation.relative_share,
                confidence_label=confidence_label,
                evidence=[rule_item, *symptom_evidence],
                uncertainty=uncertainty,
            )
        )

    relevant_rule_ids = [
        rule.id
        for rule in sorted(
            applicable_rules,
            key=lambda item: item.weight,
            reverse=True,
        )
        if set(rule.symptom_ids) & set(symptoms)
    ]
    followup = choose_followup_question(
        top_rule_ids=relevant_rule_ids,
        rules=applicable_rules,
        evaluations=evaluations,
    )

    diagnosis = Diagnosis(
        diagnosis_id=str(uuid4()),
        recipe_id=recipe.recipe_id,
        symptoms=symptoms,
        hypotheses=hypotheses,
        rule_checks=rule_checks,
        followup_question=followup.question if followup else None,
        followup_question_id=(
            f"followup:{followup.feature}" if followup else None
        ),
        followup_feature=followup.feature if followup else None,
        followup_rule_ids=(
            list(followup.related_rule_ids) if followup else []
        ),
        rule_pack_version=rule_pack.version,
    )

    warnings = list(features.warnings)

    if not recipe.family:
        warnings.append(
            "Recipe family is missing; family-specific rules were not applied."
        )
    elif not applicable_rules:
        warnings.append(
            f"No rules are available for recipe family {recipe.family!r}; "
            "diagnosis is low evidence."
        )

    if hypotheses:
        warnings.append(
            "Hypotheses are ranked leads, not confirmed causes."
        )
    else:
        warnings.append(
            "No current rule fired for these symptoms and available measurements."
        )

    return DiagnosisResult(
        diagnosis=diagnosis,
        graph=RecipeGraph(nodes=graph_nodes, edges=graph_edges),
        warnings=tuple(warnings),
    )