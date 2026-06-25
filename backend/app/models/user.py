from sqlmodel import Field
from app.db.base import BaseSQLModel

class User(BaseSQLModel, table=True):
    __tablename__ = "users"
    email: str = Field(unique=True, index=True, max_length=255)
    hashed_password: str | None = Field(default=None)
    is_active: bool = Field(default=True)
