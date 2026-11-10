import math
import re
from dataclasses import dataclass
from numbers import Real

from app.core.units import to_base_quantity
from app.models.diagnosis import SuggestedChange
from app.models.recipe import Recipe


_INGREDIENT_TARGET = re.compile(
    r"^ingredients\[(\d+)\]\.(grams|quantity)$"
)
_STEP_TARGET = re.compile(
    r"^steps\[(\d+)\]\.(duration_minutes|temperature_c)$"
)


@dataclass(frozen=True)
class RepairDiffItem:
    target: str
    from_value: float | None
    to_value: float
    unit: str | None
    reason: str


@dataclass(frozen=True)
class RepairResult:
    recipe: Recipe
    diff: tuple[RepairDiffItem, ...]


def _values_match(expected: object, current: object) -> bool:
    if expected is None or current is None:
        return expected is current

    if isinstance(expected, Real) and isinstance(current, Real):
        return math.isclose(float(expected), float(current), rel_tol=1e-9)

    return expected == current


def _format_number(value: float) -> str:
    return format(value, ".12g")


def _sync_ingredient_amount(
    ingredient_data: dict[str, object],
    field: str,
    new_value: float,
) -> None:
    if field == "grams":
        ingredient_data["grams"] = new_value
        unit = ingredient_data.get("unit")

        if isinstance(unit, str) and unit.strip():
            try:
                grams_per_unit = to_base_quantity(1.0, unit)
            except ValueError:
                return

            if grams_per_unit.unit == "g" and grams_per_unit.value != 0:
                quantity = new_value / grams_per_unit.value
                ingredient_data["quantity"] = quantity
                ingredient_data["raw_quantity"] = _format_number(quantity)
        return

    ingredient_data["quantity"] = new_value
    ingredient_data["raw_quantity"] = _format_number(new_value)

    unit = ingredient_data.get("unit")
    if not isinstance(unit, str) or not unit.strip():
        ingredient_data["grams"] = None
        return

    try:
        normalized = to_base_quantity(new_value, unit)
    except ValueError:
        ingredient_data["grams"] = None
        return

    ingredient_data["grams"] = (
        normalized.value if normalized.unit == "g" else None
    )


def apply_repair(
    recipe: Recipe,
    changes: list[SuggestedChange],
    reasons: dict[str, str] | None = None,
) -> RepairResult:
    """Apply validated, non-stale edits to supported numeric recipe fields."""
    if not changes:
        raise ValueError("At least one repair change is required.")

    reasons = reasons or {}
    draft = recipe.model_dump()
    diff: list[RepairDiffItem] = []
    changed_targets: set[str] = set()

    for change in changes:
        target = change.target

        if target in changed_targets:
            raise ValueError(f"Repair target {target!r} appears more than once.")
        changed_targets.add(target)

        ingredient_match = _INGREDIENT_TARGET.fullmatch(target)
        step_match = _STEP_TARGET.fullmatch(target)

        if ingredient_match:
            index = int(ingredient_match.group(1))
            field = ingredient_match.group(2)

            if index >= len(recipe.ingredients):
                raise ValueError(f"Ingredient index in {target!r} is out of range.")

            current_value = getattr(recipe.ingredients[index], field)
            destination = draft["ingredients"][index]
        elif step_match:
            index = int(step_match.group(1))
            field = step_match.group(2)

            if index >= len(recipe.steps):
                raise ValueError(f"Step index in {target!r} is out of range.")

            current_value = getattr(recipe.steps[index], field)
            destination = draft["steps"][index]
        else:
            raise ValueError(f"Repair target {target!r} is not supported.")

        if not _values_match(change.from_value, current_value):
            raise ValueError(
                f"Repair target {target!r} no longer matches its expected "
                f"starting value."
            )

        new_value = change.to_value
        if isinstance(new_value, bool) or not isinstance(new_value, Real):
            raise ValueError(
                f"Repair target {target!r} must have a numeric to_value."
            )

        numeric_new_value = float(new_value)

        if ingredient_match:
            _sync_ingredient_amount(
                destination,
                field,
                numeric_new_value,
            )
        else:
            destination[field] = numeric_new_value

        diff_unit = change.unit
        if ingredient_match and field == "grams":
            diff_unit = diff_unit or "g"
        elif ingredient_match:
            diff_unit = diff_unit or destination.get("unit")

        diff.append(
            RepairDiffItem(
                target=target,
                from_value=(
                    float(current_value) if current_value is not None else None
                ),
                to_value=numeric_new_value,
                unit=diff_unit if isinstance(diff_unit, str) else None,
                reason=reasons.get(
                    target,
                    "Change supplied by an accepted diagnosis hypothesis.",
                ),
            )
        )

    repaired_recipe = Recipe.model_validate(draft)
    return RepairResult(recipe=repaired_recipe, diff=tuple(diff))