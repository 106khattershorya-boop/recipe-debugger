import csv
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


ROLE_TABLE_PATH = Path(__file__).resolve().parents[2] / "knowledge" / "roles.csv"


@dataclass(frozen=True)
class IngredientRole:
    canonical: str
    roles: tuple[str, ...]
    category: str | None
    source: str
    notes: str | None


def _normalize_key(value: str) -> str:
    return " ".join(value.casefold().strip().split())


@lru_cache(maxsize=1)
def _load_role_table() -> dict[str, IngredientRole]:
    """Load the role table and index each ingredient name and alias."""
    if not ROLE_TABLE_PATH.is_file():
        raise FileNotFoundError(f"Ingredient role table not found: {ROLE_TABLE_PATH}")

    indexed_roles: dict[str, IngredientRole] = {}

    with ROLE_TABLE_PATH.open("r", encoding="utf-8", newline="") as csv_file:
        reader = csv.DictReader(csv_file)

        required_columns = {
            "canonical",
            "aliases",
            "roles",
            "category",
            "source",
            "notes",
        }
        if not reader.fieldnames or not required_columns.issubset(reader.fieldnames):
            raise ValueError(
                "Role table must include these columns: "
                + ", ".join(sorted(required_columns))
            )

        for row_number, row in enumerate(reader, start=2):
            canonical = (row.get("canonical") or "").strip()
            if not canonical:
                raise ValueError(
                    f"Missing canonical ingredient name on CSV row {row_number}."
                )

            roles = tuple(
                role.strip()
                for role in (row.get("roles") or "").split("|")
                if role.strip()
            )
            if not roles:
                raise ValueError(
                    f"Missing ingredient roles on CSV row {row_number}."
                )

            entry = IngredientRole(
                canonical=canonical,
                roles=roles,
                category=(row.get("category") or "").strip() or None,
                source=(row.get("source") or "").strip() or "team_heuristic",
                notes=(row.get("notes") or "").strip() or None,
            )

            names = [canonical]
            names.extend(
                alias.strip()
                for alias in (row.get("aliases") or "").split("|")
                if alias.strip()
            )

            for name in names:
                key = _normalize_key(name)
                existing = indexed_roles.get(key)

                if existing is not None and existing.canonical != canonical:
                    raise ValueError(
                        f"Ingredient alias {name!r} maps to both "
                        f"{existing.canonical!r} and {canonical!r}."
                    )

                indexed_roles[key] = entry

    return indexed_roles


def resolve_ingredient(name: str) -> IngredientRole | None:
    """Find a role record by canonical name or alias."""
    key = _normalize_key(name)
    if not key:
        return None

    return _load_role_table().get(key)