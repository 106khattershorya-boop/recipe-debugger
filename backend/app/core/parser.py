import re
from fractions import Fraction

from app.core.units import normalize_unit, to_base_quantity
from app.models.recipe import Recipe, RecipeIngredient, RecipeStep


_FRACTION_GLYPHS = {
    "¼": Fraction(1, 4),
    "½": Fraction(1, 2),
    "¾": Fraction(3, 4),
    "⅓": Fraction(1, 3),
    "⅔": Fraction(2, 3),
    "⅛": Fraction(1, 8),
    "⅜": Fraction(3, 8),
    "⅝": Fraction(5, 8),
    "⅞": Fraction(7, 8),
}

_QUANTITY_PATTERN = re.compile(
    r"^(?P<amount>"
    r"\d+\s+\d+/\d+|"
    r"\d+[¼½¾⅓⅔⅛⅜⅝⅞]|"
    r"\d+/\d+|"
    r"\d+(?:\.\d+)?|"
    r"[¼½¾⅓⅔⅛⅜⅝⅞]"
    r")(?=\s|$)\s*(?P<rest>.*)$"
)

_LIST_PREFIX = re.compile(r"^\s*(?:[-*•]\s*|\d+[.)]\s*)")


def _parse_amount(raw_amount: str) -> float:
    cleaned = raw_amount.strip()

    if cleaned in _FRACTION_GLYPHS:
        return float(_FRACTION_GLYPHS[cleaned])

    if len(cleaned) > 1 and cleaned[-1] in _FRACTION_GLYPHS:
        whole = int(cleaned[:-1])
        return float(whole + _FRACTION_GLYPHS[cleaned[-1]])

    if " " in cleaned and "/" in cleaned:
        whole_text, fraction_text = cleaned.split(maxsplit=1)
        return float(Fraction(whole_text) + Fraction(fraction_text))

    if "/" in cleaned:
        return float(Fraction(cleaned))

    return float(cleaned)


def _parse_ingredient_line(
    line: str,
) -> tuple[RecipeIngredient, str | None]:
    cleaned_line = _LIST_PREFIX.sub("", line).strip()
    quantity_match = _QUANTITY_PATTERN.match(cleaned_line)

    if quantity_match is None:
        has_unparsed_number = re.search(
            r"\d|[¼½¾⅓⅔⅛⅜⅝⅞]",
            cleaned_line,
        )
        warning = None
        if has_unparsed_number:
            warning = (
                f"Could not parse the leading quantity in {cleaned_line!r}; "
                "review this ingredient."
            )

        return RecipeIngredient(name=cleaned_line), warning

    raw_amount = quantity_match.group("amount").strip()
    rest = quantity_match.group("rest").strip().lstrip(",")
    quantity = _parse_amount(raw_amount)

    unit: str | None = None
    ingredient_name = rest

    if rest:
        parts = rest.split(maxsplit=1)
        possible_unit = parts[0].rstrip(",")
        try:
            normalize_unit(possible_unit)
            unit = possible_unit
            ingredient_name = parts[1] if len(parts) > 1 else ""
        except ValueError:
            # Keep count units as written; they are not converted to mass.
            if possible_unit.casefold() in {
                "clove",
                "cloves",
                "piece",
                "pieces",
                "slice",
                "slices",
                "pinch",
                "pinches",
                "dash",
                "dashes",
                "can",
                "cans",
                "packet",
                "packets",
                "stick",
                "sticks",
            }:
                unit = possible_unit
                ingredient_name = parts[1] if len(parts) > 1 else ""

    ingredient_name = ingredient_name.strip()
    if not ingredient_name:
        return (
            RecipeIngredient(
                name=cleaned_line,
                raw_quantity=raw_amount,
                quantity=quantity,
                unit=unit,
            ),
            f"Ingredient name is missing in {cleaned_line!r}; review this line.",
        )

    grams = None
    if unit is not None:
        try:
            normalized = to_base_quantity(quantity, unit)
            if normalized.unit == "g":
                grams = normalized.value
        except ValueError:
            pass

    ingredient = RecipeIngredient(
        name=ingredient_name,
        raw_quantity=raw_amount,
        quantity=quantity,
        unit=unit,
        grams=grams,
    )
    return ingredient, None


def parse_recipe_text(
    name: str,
    ingredients_text: str,
    steps_text: str = "",
) -> Recipe:
    """Parse simple line-based recipe text into the backend recipe model."""
    recipe_name = name.strip()
    if not recipe_name:
        raise ValueError("Recipe name must not be empty.")

    ingredients: list[RecipeIngredient] = []
    warnings: list[str] = []

    for line in ingredients_text.splitlines():
        if not line.strip():
            continue

        ingredient, warning = _parse_ingredient_line(line)
        ingredients.append(ingredient)
        if warning:
            warnings.append(warning)

    if not ingredients:
        raise ValueError("At least one ingredient line is required.")

    steps: list[RecipeStep] = []
    for line in steps_text.splitlines():
        cleaned_step = _LIST_PREFIX.sub("", line).strip()
        if cleaned_step:
            steps.append(
                RecipeStep(
                    order=len(steps) + 1,
                    text=cleaned_step,
                )
            )

    if not steps:
        warnings.append("No cooking steps were supplied.")

    return Recipe(
        name=recipe_name,
        ingredients=ingredients,
        steps=steps,
        parse_warnings=warnings,
    )