from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


AnswerValue = str | float | bool


class ParseRecipeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    family: str | None = Field(default=None, max_length=80)
    ingredients_text: str = Field(min_length=1)
    steps_text: str = ""


class DiagnoseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recipe_id: str = Field(min_length=1)
    expected_result: str | None = None
    reported_symptoms: list[str] = Field(min_length=1)
    answers: dict[str, AnswerValue] = Field(default_factory=dict)


class FollowupAnswerRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question_id: str = Field(min_length=1)
    value: AnswerValue


class CounterfactualChangeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target: str = Field(min_length=1)
    from_value: float | None = None
    to_value: float
    unit: str | None = None


class CounterfactualRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    diagnosis_id: str = Field(min_length=1)
    changes: list[CounterfactualChangeRequest] = Field(min_length=1)


class RepairRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    diagnosis_id: str = Field(min_length=1)
    accepted_hypothesis_ids: list[str] = Field(min_length=1)


class FeedbackRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    diagnosis_id: str = Field(min_length=1)
    outcome: Literal["worked", "did_not_work"]
    note: str | None = None