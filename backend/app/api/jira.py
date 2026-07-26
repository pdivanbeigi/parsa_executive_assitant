from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_username, get_db_session
from app.core.config import get_settings
from app.db.models import TeamMember
from app.schemas.jira import JiraAuthorizeUrlOut, JiraConnectionOut, JiraIssueOut, JiraUserOut
from app.services import jira_oauth, jira_service

router = APIRouter(prefix="/api/jira", tags=["jira"], dependencies=[Depends(get_current_username)])

# Atlassian redirects the browser here, so it cannot carry our bearer token. The
# signed `state` parameter is what protects this endpoint instead.
callback_router = APIRouter(prefix="/api/jira", tags=["jira"])


def _http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, jira_service.JiraNotConfiguredError):
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, jira_service.JiraApiError):
        return HTTPException(status_code=502, detail=exc.message)
    return HTTPException(status_code=502, detail=str(exc))


@router.get("/connection", response_model=JiraConnectionOut)
def get_connection(db: Session = Depends(get_db_session)) -> dict:
    return jira_oauth.connection_status(db)


@router.get("/connection/authorize-url", response_model=JiraAuthorizeUrlOut)
def get_authorize_url() -> dict:
    try:
        return {"authorize_url": jira_oauth.build_authorize_url()}
    except jira_oauth.JiraOAuthError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.delete("/connection", status_code=204)
def delete_connection(db: Session = Depends(get_db_session)) -> None:
    jira_oauth.disconnect(db)


@callback_router.get("/oauth/callback", include_in_schema=False)
def oauth_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    db: Session = Depends(get_db_session),
) -> RedirectResponse:
    frontend = get_settings().frontend_origin.rstrip("/")

    def redirect(params: dict[str, str]) -> RedirectResponse:
        return RedirectResponse(f"{frontend}/integrations?{urlencode(params)}")

    if error:
        return redirect({"jira": "error", "message": error_description or error})
    if not code:
        return redirect({"jira": "error", "message": "Atlassian did not return an authorization code."})

    try:
        jira_oauth.complete_authorization(db, code=code, state=state)
    except jira_oauth.JiraOAuthError as exc:
        return redirect({"jira": "error", "message": str(exc)})
    return redirect({"jira": "connected"})


@router.get("/tasks", response_model=list[JiraIssueOut])
def get_tasks(
    scope: str = Query("mine", pattern="^(mine|team)$"),
    db: Session = Depends(get_db_session),
) -> list[dict]:
    try:
        if scope == "mine":
            return jira_service.get_my_tasks(db)
        account_ids = [
            m.jira_account_id
            for m in db.scalars(select(TeamMember).where(TeamMember.jira_account_id.is_not(None)))
        ]
        return jira_service.get_team_tasks(db, account_ids)
    except (jira_service.JiraNotConfiguredError, jira_service.JiraApiError) as exc:
        raise _http_error(exc) from exc


@router.get("/users/search", response_model=list[JiraUserOut])
def search_users(
    query: str = Query(..., min_length=1),
    db: Session = Depends(get_db_session),
) -> list[dict]:
    try:
        return jira_service.search_users(db, query)
    except (jira_service.JiraNotConfiguredError, jira_service.JiraApiError) as exc:
        raise _http_error(exc) from exc


@router.get("/issues/{issue_key}", response_model=JiraIssueOut)
def get_issue(issue_key: str, db: Session = Depends(get_db_session)) -> dict:
    try:
        return jira_service.get_issue(db, issue_key)
    except (jira_service.JiraNotConfiguredError, jira_service.JiraApiError) as exc:
        raise _http_error(exc) from exc
