from datetime import datetime

from pydantic import BaseModel


class JiraIssueOut(BaseModel):
    key: str | None
    summary: str | None
    status: str | None
    priority: str | None
    issue_type: str | None
    assignee_name: str | None
    assignee_account_id: str | None
    due_date: str | None
    url: str | None


class JiraConnectionOut(BaseModel):
    connected: bool
    auth_method: str  # "oauth" | "api_token" | "none"
    oauth_available: bool
    site_name: str | None = None
    site_url: str | None = None
    account_name: str | None = None
    account_email: str | None = None
    account_id: str | None = None
    scopes: list[str] = []
    connected_at: datetime | None = None
    project_key: str | None = None
    redirect_uri: str


class JiraAuthorizeUrlOut(BaseModel):
    authorize_url: str


class JiraUserOut(BaseModel):
    account_id: str | None
    display_name: str | None
    email: str | None
    avatar_url: str | None
