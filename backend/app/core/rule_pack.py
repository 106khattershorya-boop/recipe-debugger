from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.rules import RuleDefinition


RULE_PACK_PATH = Path(__file__).resolve().parents[2] / "knowledge" / "rules.json"


class RulePack(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: str = Field(min_length=1)
    rules: list[RuleDefinition] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_unique_rule_ids(self) -> "RulePack":
        rule_ids = [rule.id for rule in self.rules]
        if len(rule_ids) != len(set(rule_ids)):
            raise ValueError("Rule IDs must be unique within the rule pack.")
        return self


@lru_cache(maxsize=1)
def load_rule_pack() -> RulePack:
    """Load and validate the versioned rule pack from the knowledge folder."""
    if not RULE_PACK_PATH.is_file():
        raise FileNotFoundError(f"Rule pack not found: {RULE_PACK_PATH}")

    rule_pack_text = RULE_PACK_PATH.read_text(encoding="utf-8")
    return RulePack.model_validate_json(rule_pack_text)