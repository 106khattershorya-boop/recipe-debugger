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

_OPERATION_PATTERN = re.compile(
    r"\b(preheat|knead|ferment|simmer|saute|sauté|"
    r"combine|whisk|blend|steam|roast|bake|"
    r"fry|soak|boil|chill|cool|heat|cook|"
    r"mix|stir|fold|rest|shape)\b",
    flags=re.IGNORECASE,
)

_DURATION_PATTERN = re.compile(
    r"\b(?P<amount>\d+(?:\.\d+)?)\s*"
    r"(?P<unit>seconds?|secs?|minutes?|mins?|hours?|hrs?)\b",
    flags=re.IGNORECASE,
)

_TEMPERATURE_PATTERN = re.compile(
    r"\b(?P<value>-?\d+(?:\.\d+)?)\s*"
    r"(?:°\s*)?(?P<unit>c|f)\b"
    r"|"
    r"\b(?P<word_value>-?\d+(?:\.\d+)?)\s*degrees?\s+"
    r"(?P<word_unit>celsius|fahrenheit)\b",
    flags=re.IGNORECASE,
)


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


def _extract_step_operation(step_text: str) -> str | None:
    match = _OPERATION_PATTERN.search(step_text)
    return match.group(1).casefold() if match else None


def _extract_duration_minutes(step_text: str) -> float | None:
    match = _DURATION_PATTERN.search(step_text)
    if match is None:
        return None

    amount = float(match.group("amount"))
    unit = match.group("unit").casefold()

    if unit.startswith(("second", "sec")):
        return amount / 60
    if unit.startswith(("hour", "hr")):
        return amount * 60
    return amount


def _extract_temperature_c(step_text: str) -> float | None:
    match = _TEMPERATURE_PATTERN.search(step_text)
    if match is None:
        return None

    value_text = match.group("value") or match.group("word_value")
    unit = (match.group("unit") or match.group("word_unit")).casefold()
    value = float(value_text)

    if unit in {"f", "fahrenheit"}:
        return round((value - 32) * 5 / 9, 2)
    return value


def parse_recipe_text(
    name: str,
    ingredients_text: str,
    steps_text: str = "",
    family: str | None = None,
) -> Recipe:
    """Parse recipe text, preserving family and explicit step details."""
    recipe_name = name.strip()
    if not recipe_name:
        raise ValueError("Recipe name must not be empty.")

    cleaned_family = family.strip() if family and family.strip() else None

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
                    operation=_extract_step_operation(cleaned_step),
                    duration_minutes=_extract_duration_minutes(cleaned_step),
                    temperature_c=_extract_temperature_c(cleaned_step),
                )
            )

    if not steps:
        warnings.append("No cooking steps were supplied.")

    return Recipe(
        name=recipe_name,
        family=cleaned_family,
        ingredients=ingredients,
        steps=steps,
        parse_warnings=warnings,
    )