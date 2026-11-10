import re

from app.core.roles import resolve_ingredient
from app.models.graph import GraphEdge, GraphNode, RecipeGraph
from app.models.recipe import Recipe


def _ingredient_is_named_in_step(ingredient_name: str, step_text: str) -> bool:
    """Check for a whole-name match, avoiding partial matches inside other words."""
    pattern = rf"(?<!\w){re.escape(ingredient_name)}(?!\w)"
    return re.search(pattern, step_text, flags=re.IGNORECASE) is not None


def build_recipe_graph(recipe: Recipe, symptoms: list[str]) -> RecipeGraph:
    """Build a graph using only recipe data and explicit ingredient mentions."""
    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []

    ingredient_nodes: list[tuple[str, str, str | None]] = []

    for index, ingredient in enumerate(recipe.ingredients, start=1):
        node_id = f"ingredient_{index}"
        role_entry = resolve_ingredient(
            ingredient.canonical_name or ingredient.name
        )
        roles = list(role_entry.roles) if role_entry is not None else []

        nodes.append(
            GraphNode(
                id=node_id,
                type="ingredient",
                label=ingredient.canonical_name or ingredient.name,
                roles=roles,
                grams=ingredient.grams,
            )
        )
        ingredient_nodes.append(
            (node_id, ingredient.name, ingredient.canonical_name)
        )

    for index, step in enumerate(recipe.steps, start=1):
        operation_id = f"operation_{index}"
        operation_label = step.operation or f"Step {step.order}: {step.text}"

        nodes.append(
            GraphNode(
                id=operation_id,
                type="operation",
                label=operation_label,
                minutes=step.duration_minutes,
                temperature_c=step.temperature_c,
            )
        )

        for ingredient_id, ingredient_name, canonical_name in ingredient_nodes:
            names_to_check = [ingredient_name]
            if canonical_name and canonical_name != ingredient_name:
                names_to_check.append(canonical_name)

            if any(
                _ingredient_is_named_in_step(name, step.text)
                for name in names_to_check
            ):
                edges.append(
                    GraphEdge(
                        source_id=ingredient_id,
                        target_id=operation_id,
                        kind="USED_IN",
                    )
                )

    for index, symptom in enumerate(symptoms, start=1):
        cleaned_symptom = symptom.strip()
        if cleaned_symptom:
            nodes.append(
                GraphNode(
                    id=f"symptom_{index}",
                    type="symptom",
                    label=cleaned_symptom,
                )
            )

    return RecipeGraph(nodes=nodes, edges=edges)