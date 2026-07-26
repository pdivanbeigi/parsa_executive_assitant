from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class TodoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=512)
    notes: str | None = None
    due_date: date | None = None
    priority: str = "medium"


class TodoUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=512)
    notes: str | None = None
    due_date: date | None = None
    priority: str | None = None
    completed: bool | None = None


class TodoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    notes: str | None
    due_date: date | None
    priority: str
    completed: bool
    created_at: datetime
    updated_at: datetime
