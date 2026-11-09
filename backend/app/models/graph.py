from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


NodeType = Literal["ingredient", "operation", "intermediate", "symptom"]
EdgeKind = Literal["USED_IN", "FEEDS", "RATIO", "AFFECTS"]


class GraphNode(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    type: NodeType
    label: str = Field(min_length=1)
    roles: list[str] = Field(default_factory=list)
    grams: float | None = Field(default=None, ge=0)
    minutes: float | None = Field(default=None, ge=0)
    temperature_c: float | None = None


class GraphEdge(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_id: str = Field(min_length=1)
    target_id: str = Field(min_length=1)
    kind: EdgeKind
    rule_id: str | None = None
    weight: float | None = Field(default=None, ge=0, le=1)
    active: bool | None = None
    evidence_ids: list[str] = Field(default_factory=list)


class RecipeGraph(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_graph_references(self) -> "RecipeGraph":
        node_ids = [node.id for node in self.nodes]

        if len(node_ids) != len(set(node_ids)):
            raise ValueError("Graph node IDs must be unique.")

        known_node_ids = set(node_ids)
        for edge in self.edges:
            if edge.source_id not in known_node_ids:
                raise ValueError(
                    f"Edge source '{edge.source_id}' is not a graph node."
                )
            if edge.target_id not in known_node_ids:
                raise ValueError(
                    f"Edge target '{edge.target_id}' is not a graph node."
                )

        return self