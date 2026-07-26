from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class WhiteboardCreate(BaseModel):
    title: str
    meeting_id: int | None = None
    data: dict[str, Any] | None = None


class WhiteboardUpdate(BaseModel):
    title: str
    data: dict[str, Any]


class WhiteboardListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    meeting_id: int | None
    created_at: datetime
    updated_at: datetime


class WhiteboardOut(WhiteboardListOut):
    data: dict[str, Any]
