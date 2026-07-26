from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.team_member import TeamMemberOut


class MeetingBase(BaseModel):
    title: str
    meeting_date: date
    raw_notes: str | None = None


class MeetingCreate(MeetingBase):
    attendee_ids: list[int] = []


class MeetingUpdate(MeetingBase):
    attendee_ids: list[int] = []
    status: str | None = None


class MeetingSummarizeRequest(BaseModel):
    raw_notes: str | None = None


class MeetingListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    meeting_date: date
    status: str
    created_at: datetime
    attendees: list[TeamMemberOut] = []


class MeetingOut(MeetingListOut):
    raw_notes: str | None = None
    ai_summary: dict | None = None
