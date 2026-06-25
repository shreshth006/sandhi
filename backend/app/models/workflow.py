import uuid
from sqlmodel import Field, Column
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base import BaseSQLModel

DEFAULT_GRAPH = {"nodes": [], "edges": []}

class Workflow(BaseSQLModel, table=True):
    __tablename__ = "workflows"
    owner_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    name: str = Field(max_length=200)
    graph: dict = Field(default_factory=lambda: dict(DEFAULT_GRAPH), sa_column=Column(JSONB))
