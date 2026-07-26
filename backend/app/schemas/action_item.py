from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.team_member import TeamMemberOut


class ActionItemBase(BaseModel):
    description: str
    assignee_id: int | None = None
    due_date: date | None = None
    status: str = "open"
    jira_issue_key: str | None = None
    jira_issue_summary: str | None = None


class ActionItemCreate(ActionItemBase):
    pass


class ActionItemUpdate(ActionItemBase):
    pass


class ActionItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: int
    description: str
    due_date: date | None
    status: str
    jira_issue_key: str | None
    jira_issue_summary: str | None
    created_at: datetime
    assignee: TeamMemberOut | None = None
