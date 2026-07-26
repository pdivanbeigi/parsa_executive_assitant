import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.services import jira_oauth


class JiraNotConfiguredError(Exception):
    """No usable JIRA credentials; the user needs to connect on the Integrations page."""


class JiraApiError(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message


NOT_CONFIGURED_MESSAGE = (
    "JIRA is not connected. Open Integrations and sign in with your Atlassian account."
)


def _normalize_site_url(raw: str) -> str:
    site_url = raw.strip().rstrip("/")
    if site_url and not site_url.startswith(("http://", "https://")):
        site_url = f"https://{site_url}"
    return site_url


def _connect(db: Session) -> tuple[httpx.Client, str]:
    """Build a JIRA HTTP client. Returns the client plus the site URL for browse links."""
    settings = get_settings()

    credential = jira_oauth.get_credential(db) if jira_oauth.oauth_configured() else None
    if credential and credential.cloud_id:
        try:
            access_token = jira_oauth.get_access_token(db, credential)
        except jira_oauth.JiraReauthRequiredError as exc:
            raise JiraNotConfiguredError(str(exc)) from exc
        except jira_oauth.JiraOAuthError as exc:
            raise JiraApiError(502, str(exc)) from exc
        client = httpx.Client(
            base_url=f"{jira_oauth.API_BASE}/ex/jira/{credential.cloud_id}",
            headers={"Accept": "application/json", "Authorization": f"Bearer {access_token}"},
            timeout=15.0,
        )
        return client, credential.site_url or ""

    if settings.jira_base_url and settings.jira_email and settings.jira_api_token:
        site_url = _normalize_site_url(settings.jira_base_url)
        client = httpx.Client(
            base_url=site_url,
            auth=(settings.jira_email, settings.jira_api_token),
            headers={"Accept": "application/json"},
            timeout=15.0,
        )
        return client, site_url

    raise JiraNotConfiguredError(NOT_CONFIGURED_MESSAGE)


def _get(db: Session, path: str, params: dict) -> tuple[dict, str]:
    client, site_url = _connect(db)
    with client:
        try:
            response = client.get(path, params=params)
        except httpx.HTTPError as exc:
            raise JiraApiError(502, f"Could not reach JIRA: {exc}") from exc

    if response.status_code in (401, 403):
        raise JiraNotConfiguredError(
            "JIRA rejected the stored credentials. Please reconnect your Atlassian account on the "
            "Integrations page."
        )
    if response.status_code >= 400:
        raise JiraApiError(response.status_code, f"JIRA API error: {response.text}")
    return response.json(), site_url


ISSUE_FIELDS = "summary,status,assignee,priority,issuetype,duedate"


def _simplify_issue(raw: dict, site_url: str) -> dict:
    fields = raw.get("fields", {})
    assignee = fields.get("assignee") or {}
    status = fields.get("status") or {}
    priority = fields.get("priority") or {}
    issue_type = fields.get("issuetype") or {}
    return {
        "key": raw.get("key"),
        "summary": fields.get("summary"),
        "status": status.get("name"),
        "priority": priority.get("name"),
        "issue_type": issue_type.get("name"),
        "assignee_name": assignee.get("displayName"),
        "assignee_account_id": assignee.get("accountId"),
        "due_date": fields.get("duedate"),
        "url": f"{site_url.rstrip('/')}/browse/{raw.get('key')}" if site_url else None,
    }


def search_issues(db: Session, jql: str, max_results: int = 50) -> list[dict]:
    payload, site_url = _get(
        db,
        "/rest/api/3/search/jql",
        {"jql": jql, "maxResults": max_results, "fields": ISSUE_FIELDS},
    )
    return [_simplify_issue(issue, site_url) for issue in payload.get("issues", [])]


def _project_filter() -> str:
    settings = get_settings()
    return f" AND project = \"{settings.jira_project_key}\"" if settings.jira_project_key else ""


def get_my_tasks(db: Session) -> list[dict]:
    jql = f"assignee = currentUser() AND statusCategory != Done{_project_filter()} ORDER BY updated DESC"
    return search_issues(db, jql)


def get_team_tasks(db: Session, account_ids: list[str]) -> list[dict]:
    if not account_ids:
        return []
    ids = ", ".join(f'"{aid}"' for aid in account_ids)
    jql = f"assignee in ({ids}) AND statusCategory != Done{_project_filter()} ORDER BY updated DESC"
    return search_issues(db, jql)


def get_issue(db: Session, issue_key: str) -> dict:
    payload, site_url = _get(db, f"/rest/api/3/issue/{issue_key}", {"fields": ISSUE_FIELDS})
    return _simplify_issue(payload, site_url)


def search_users(db: Session, query: str, max_results: int = 10) -> list[dict]:
    """Find Atlassian users so account IDs can be filled in without copy-pasting."""
    client, _ = _connect(db)
    with client:
        try:
            response = client.get(
                "/rest/api/3/user/search", params={"query": query, "maxResults": max_results}
            )
        except httpx.HTTPError as exc:
            raise JiraApiError(502, f"Could not reach JIRA: {exc}") from exc

    if response.status_code in (401, 403):
        raise JiraNotConfiguredError(
            "Your JIRA connection is not allowed to look up users. Reconnect on the Integrations page."
        )
    if response.status_code >= 400:
        raise JiraApiError(response.status_code, f"JIRA API error: {response.text}")

    return [
        {
            "account_id": user.get("accountId"),
            "display_name": user.get("displayName"),
            "email": user.get("emailAddress"),
            "avatar_url": (user.get("avatarUrls") or {}).get("24x24"),
        }
        for user in response.json()
        if user.get("accountType", "atlassian") == "atlassian"
    ]
