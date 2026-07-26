from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SlackNotificationRequest(BaseModel):
    team_member_id: int | None = None
    channel: str | None = None
    message: str
    related_meeting_id: int | None = None
    related_action_item_id: int | None = None


class EmailNotificationRequest(BaseModel):
    team_member_id: int | None = None
    email: str | None = None
    subject: str
    body: str
    attach_report_id: int | None = None
    related_meeting_id: int | None = None
    related_action_item_id: int | None = None


class NotificationLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    recipient: str
    subject: str | None
    status: str
    error_message: str | None
    related_meeting_id: int | None
    related_action_item_id: int | None
    sent_at: datetime
