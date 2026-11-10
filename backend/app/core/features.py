from dataclasses import dataclass

from app.core.roles import resolve_ingredient
from app.core.units import to_base_quantity
from app.models.recipe import Recipe, RecipeIngredient


@dataclass(frozen=True)
class RecipeFeatures:
    role_totals_g: dict[str, float]
    ratios_to_flour: dict[str, float | None]
    ratios_are_partial: bool
    unmeasured_ingredients: tuple[str, ...]
    unclassified_ingredients: tuple[str, ...]
    role_sources: tuple[str, ...]
    warnings: tuple[str, ...]


def _ingredient_grams(ingredient: RecipeIngredient) -> float | None:
    if ingredient.grams is not None:
        return ingredient.grams

    if ingredient.quantity is None or ingredient.unit is None:
        return None

    try:
        normalized = to_base_quantity(ingredient.quantity, ingredient.unit)
    except ValueError:
        return None

    if normalized.unit == "g":
        return normalized.value

    return None


def compute_recipe_features(recipe: Recipe) -> RecipeFeatures:
    """Compute role totals and heuristic ratios from known ingredient masses."""
    role_totals_g: dict[str, float] = {}
    unmeasured: list[str] = []
    unclassified: list[str] = []
    role_sources: set[str] = set()

    for ingredient in recipe.ingredients:
        lookup_name = ingredient.canonical_name or ingredient.name
        role_entry = resolve_ingredient(lookup_name)
        grams = _ingredient_grams(ingredient)

        if role_entry is None:
            unclassified.append(ingredient.name)
            continue

        role_sources.add(role_entry.source)

        if grams is None:
            unmeasured.append(ingredient.name)
            continue

        for role in role_entry.roles:
            role_totals_g[role] = role_totals_g.get(role, 0.0) + grams

    flour_grams = role_totals_g.get("flour_base", 0.0)

    ratio_roles = {
        "fat_to_flour": "fat",
        "moisture_to_flour": "moisture",
        "leavening_to_flour": "leavening",
        "sweetness_to_flour": "sweetness",
    }

    ratios: dict[str, float | None] = {}
    for ratio_name, numerator_role in ratio_roles.items():
        numerator_grams = role_totals_g.get(numerator_role, 0.0)
        if flour_grams <= 0:
            ratios[ratio_name] = None
        else:
            ratios[ratio_name] = round(numerator_grams / flour_grams, 6)

    is_partial = bool(unmeasured or unclassified)
    warnings: list[str] = []

    if role_sources:
        warnings.append(
            "Ingredient roles are team heuristics and may depend on recipe context."
        )

    if unmeasured:
        warnings.append(
            "Some ingredient amounts are not available in grams; ratios may be partial."
        )

    if unclassified:
        warnings.append(
            "Some ingredients have no role mapping; ratios may be partial."
        )

    if flour_grams <= 0:
        warnings.append(
            "No measured flour_base amount is available; ratios to flour are unavailable."
        )

    return RecipeFeatures(
        role_totals_g=role_totals_g,
        ratios_to_flour=ratios,
        ratios_are_partial=is_partial,
        unmeasured_ingredients=tuple(unmeasured),
        unclassified_ingredients=tuple(unclassified),
        role_sources=tuple(sorted(role_sources)),
        warnings=tuple(warnings),
    )