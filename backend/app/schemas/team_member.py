from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class TeamMemberBase(BaseModel):
    name: str
    email: EmailStr
    slack_user_id: str | None = None
    jira_account_id: str | None = None


class TeamMemberCreate(TeamMemberBase):
    pass


class TeamMemberUpdate(TeamMemberBase):
    pass


class TeamMemberOut(TeamMemberBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
