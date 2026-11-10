from dataclasses import dataclass


_UNIT_ALIASES = {
    # Mass
    "g": "g",
    "gram": "g",
    "grams": "g",
    "kg": "kg",
    "kilogram": "kg",
    "kilograms": "kg",
    "mg": "mg",
    "milligram": "mg",
    "milligrams": "mg",
    "oz": "oz",
    "ounce": "oz",
    "ounces": "oz",
    "lb": "lb",
    "lbs": "lb",
    "pound": "lb",
    "pounds": "lb",
    # Volume
    "ml": "ml",
    "milliliter": "ml",
    "milliliters": "ml",
    "millilitre": "ml",
    "millilitres": "ml",
    "l": "l",
    "liter": "l",
    "liters": "l",
    "litre": "l",
    "litres": "l",
    "tsp": "tsp",
    "teaspoon": "tsp",
    "teaspoons": "tsp",
    "tbsp": "tbsp",
    "tablespoon": "tbsp",
    "tablespoons": "tbsp",
    "cup": "cup",
    "cups": "cup",
    # Time
    "s": "s",
    "sec": "s",
    "second": "s",
    "seconds": "s",
    "min": "min",
    "minute": "min",
    "minutes": "min",
    "h": "h",
    "hr": "h",
    "hour": "h",
    "hours": "h",
    # Temperature
    "c": "c",
    "°c": "c",
    "celsius": "c",
    "f": "f",
    "°f": "f",
    "fahrenheit": "f",
}

_MASS_TO_GRAMS = {
    "g": 1.0,
    "kg": 1000.0,
    "mg": 0.001,
    "oz": 28.349523125,
    "lb": 453.59237,
}

_VOLUME_TO_MILLILITERS = {
    "ml": 1.0,
    "l": 1000.0,
    "tsp": 5.0,
    "tbsp": 15.0,
    "cup": 240.0,
}

_TIME_TO_MINUTES = {
    "s": 1.0 / 60.0,
    "min": 1.0,
    "h": 60.0,
}


@dataclass(frozen=True)
class NormalizedQuantity:
    value: float
    unit: str
    assumption: str | None = None


def normalize_unit(unit: str) -> str:
    """Return the canonical spelling for a supported unit."""
    cleaned = unit.strip().lower().replace(".", "")

    try:
        return _UNIT_ALIASES[cleaned]
    except KeyError as exc:
        raise ValueError(f"Unsupported unit: {unit!r}") from exc


def to_base_quantity(value: float, unit: str) -> NormalizedQuantity:
    """Convert mass to grams, volume to milliliters, or time to minutes."""
    canonical_unit = normalize_unit(unit)

    if canonical_unit in _MASS_TO_GRAMS:
        return NormalizedQuantity(
            value=value * _MASS_TO_GRAMS[canonical_unit],
            unit="g",
        )

    if canonical_unit in _VOLUME_TO_MILLILITERS:
        assumption = None
        if canonical_unit == "cup":
            assumption = "Cup interpreted as 240 mL; volume not converted to mass."

        return NormalizedQuantity(
            value=value * _VOLUME_TO_MILLILITERS[canonical_unit],
            unit="ml",
            assumption=assumption,
        )

    if canonical_unit in _TIME_TO_MINUTES:
        return NormalizedQuantity(
            value=value * _TIME_TO_MINUTES[canonical_unit],
            unit="min",
        )

    raise ValueError(
        f"Unit {unit!r} is not a mass, volume, or time quantity."
    )


def to_celsius(value: float, unit: str) -> float:
    """Convert a Celsius or Fahrenheit temperature to Celsius."""
    canonical_unit = normalize_unit(unit)

    if canonical_unit == "c":
        return value

    if canonical_unit == "f":
        return (value - 32.0) * 5.0 / 9.0

    raise ValueError(f"Unsupported temperature unit: {unit!r}")