import csv
from pathlib import Path
from typing import Any


ROLE_TABLE_PATH = Path(__file__).resolve().parents[2] / "knowledge" / "roles.csv"


async def seed_ingredient_roles(database: Any) -> int:
    """Upsert role-table entries into MongoDB and return the row count."""
    if not ROLE_TABLE_PATH.is_file():
        raise FileNotFoundError(f"Ingredient role table not found: {ROLE_TABLE_PATH}")

    collection = database["ingredient_roles"]
    await collection.create_index("canonical", unique=True)
    await collection.create_index("aliases")

    seeded_count = 0

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

            aliases = [
                alias.strip()
                for alias in (row.get("aliases") or "").split("|")
                if alias.strip()
            ]
            roles = [
                role.strip()
                for role in (row.get("roles") or "").split("|")
                if role.strip()
            ]
            if not roles:
                raise ValueError(
                    f"Missing ingredient roles on CSV row {row_number}."
                )

            document = {
                "canonical": canonical,
                "aliases": aliases,
                "roles": roles,
                "category": (row.get("category") or "").strip() or None,
                "source": (row.get("source") or "").strip() or "team_heuristic",
                "notes": (row.get("notes") or "").strip() or None,
            }

            await collection.replace_one(
                {"canonical": canonical},
                document,
                upsert=True,
            )
            seeded_count += 1

    return seeded_count