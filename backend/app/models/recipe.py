from pydantic import BaseModel, ConfigDict, Field


class RecipeIngredient(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    raw_quantity: str | None = None
    quantity: float | None = Field(default=None, ge=0)
    unit: str | None = None
    state: str | None = None
    canonical_name: str | None = None
    grams: float | None = Field(default=None, ge=0)


class RecipeStep(BaseModel):
    model_config = ConfigDict(extra="forbid")

    order: int = Field(ge=1)
    text: str = Field(min_length=1)
    operation: str | None = None
    duration_minutes: float | None = Field(default=None, ge=0)
    temperature_c: float | None = None


class Recipe(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recipe_id: str | None = None
    name: str = Field(min_length=1)
    family: str | None = None
    servings: float | None = Field(default=None, gt=0)
    ingredients: list[RecipeIngredient] = Field(min_length=1)
    steps: list[RecipeStep] = Field(default_factory=list)
    parse_warnings: list[str] = Field(default_factory=list)