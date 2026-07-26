"""Atlassian OAuth 2.0 (3LO) connection handling for JIRA Cloud.

Lets a user connect JIRA by signing in with their Atlassian account instead of
pasting an email + API token. Tokens are stored encrypted in the database and
refreshed automatically.
"""

from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.crypto import decrypt_secret, encrypt_secret
from app.core.security import create_state_token, verify_state_token
from app.db.models import IntegrationCredential

AUTH_BASE = "https://auth.atlassian.com"
API_BASE = "https://api.atlassian.com"
PROVIDER = "jira"
STATE_PURPOSE = "jira-oauth"

# Refresh a little early so a token can't expire mid-request.
_REFRESH_LEEWAY = timedelta(minutes=2)


class JiraOAuthError(Exception):
    pass


class JiraReauthRequiredError(JiraOAuthError):
    """The stored grant is gone or invalid; the user has to connect again."""


def oauth_configured() -> bool:
    settings = get_settings()
    return bool(settings.jira_client_id and settings.jira_client_secret)


def _require_config() -> None:
    if not oauth_configured():
        raise JiraOAuthError(
            "Atlassian sign-in is not set up. Add JIRA_CLIENT_ID and JIRA_CLIENT_SECRET to backend/.env."
        )


def build_authorize_url() -> str:
    """Build the Atlassian consent URL the browser should be sent to."""
    _require_config()
    settings = get_settings()
    params = {
        "audience": "api.atlassian.com",
        "client_id": settings.jira_client_id,
        "scope": settings.jira_oauth_scopes,
        "redirect_uri": settings.jira_oauth_redirect_uri,
        "state": create_state_token(STATE_PURPOSE),
        "response_type": "code",
        "prompt": "consent",
    }
    return f"{AUTH_BASE}/authorize?{urlencode(params)}"


def _post_token(payload: dict) -> dict:
    try:
        response = httpx.post(f"{AUTH_BASE}/oauth/token", json=payload, timeout=15.0)
    except httpx.HTTPError as exc:
        raise JiraOAuthError(f"Could not reach Atlassian: {exc}") from exc

    if response.status_code >= 400:
        detail = response.json().get("error_description") if _is_json(response) else response.text
        if response.status_code in (400, 401, 403):
            raise JiraReauthRequiredError(f"Atlassian rejected the request: {detail}")
        raise JiraOAuthError(f"Atlassian token request failed: {detail}")
    return response.json()


def _is_json(response: httpx.Response) -> bool:
    return response.headers.get("content-type", "").startswith("application/json")


def _get_json(url: str, access_token: str) -> dict | list:
    try:
        response = httpx.get(
            url,
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
            timeout=15.0,
        )
    except httpx.HTTPError as exc:
        raise JiraOAuthError(f"Could not reach Atlassian: {exc}") from exc
    if response.status_code >= 400:
        raise JiraOAuthError(f"Atlassian API error ({response.status_code}): {response.text}")
    return response.json()


def get_credential(db: Session) -> IntegrationCredential | None:
    return db.scalar(select(IntegrationCredential).where(IntegrationCredential.provider == PROVIDER))


def _pick_site(resources: list[dict]) -> dict:
    """Choose which Atlassian site to use when the grant covers several."""
    if not resources:
        raise JiraOAuthError(
            "Your Atlassian account did not grant access to any JIRA site. "
            "Make sure you selected a site on the consent screen."
        )
    configured = get_settings().jira_base_url.strip().rstrip("/")
    if configured:
        wanted = configured.removeprefix("https://").removeprefix("http://")
        for resource in resources:
            if resource.get("url", "").removeprefix("https://").rstrip("/") == wanted:
                return resource
    return resources[0]


def _fetch_account(access_token: str, cloud_id: str) -> dict:
    """Look up who authorised the connection. Best-effort: needs read:jira-user."""
    try:
        myself = _get_json(f"{API_BASE}/ex/jira/{cloud_id}/rest/api/3/myself", access_token)
    except JiraOAuthError:
        return {}
    return myself if isinstance(myself, dict) else {}


def complete_authorization(db: Session, code: str, state: str | None) -> IntegrationCredential:
    """Exchange the callback code for tokens and persist the connection."""
    _require_config()
    if not verify_state_token(state, STATE_PURPOSE):
        raise JiraOAuthError("The sign-in link expired or was tampered with. Please try connecting again.")

    settings = get_settings()
    tokens = _post_token(
        {
            "grant_type": "authorization_code",
            "client_id": settings.jira_client_id,
            "client_secret": settings.jira_client_secret,
            "code": code,
            "redirect_uri": settings.jira_oauth_redirect_uri,
        }
    )

    access_token = tokens.get("access_token")
    if not access_token:
        raise JiraOAuthError("Atlassian did not return an access token.")

    resources = _get_json(f"{API_BASE}/oauth/token/accessible-resources", access_token)
    site = _pick_site(resources if isinstance(resources, list) else [])
    cloud_id = site.get("id")
    if not cloud_id:
        raise JiraOAuthError("Atlassian did not return a cloud ID for your site.")

    account = _fetch_account(access_token, cloud_id)

    credential = get_credential(db) or IntegrationCredential(provider=PROVIDER)
    credential.access_token = encrypt_secret(access_token)
    refresh_token = tokens.get("refresh_token")
    credential.refresh_token = encrypt_secret(refresh_token) if refresh_token else None
    credential.expires_at = _expiry_from(tokens.get("expires_in"))
    credential.scopes = tokens.get("scope")
    credential.cloud_id = cloud_id
    credential.site_url = (site.get("url") or "").rstrip("/")
    credential.site_name = site.get("name")
    credential.account_id = account.get("accountId")
    credential.account_email = account.get("emailAddress")
    credential.account_name = account.get("displayName")

    db.add(credential)
    db.commit()
    db.refresh(credential)
    return credential


def _expiry_from(expires_in: object) -> datetime | None:
    if not isinstance(expires_in, int):
        return None
    return datetime.now(timezone.utc) + timedelta(seconds=expires_in)


def _is_expiring(credential: IntegrationCredential) -> bool:
    if credential.expires_at is None:
        return True
    expires_at = credential.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at - _REFRESH_LEEWAY <= datetime.now(timezone.utc)


def _refresh(db: Session, credential: IntegrationCredential) -> str:
    refresh_token = decrypt_secret(credential.refresh_token)
    if not refresh_token:
        raise JiraReauthRequiredError(
            "Your JIRA connection expired and cannot be renewed. Please reconnect your Atlassian account."
        )

    settings = get_settings()
    tokens = _post_token(
        {
            "grant_type": "refresh_token",
            "client_id": settings.jira_client_id,
            "client_secret": settings.jira_client_secret,
            "refresh_token": refresh_token,
        }
    )

    access_token = tokens.get("access_token")
    if not access_token:
        raise JiraReauthRequiredError("Atlassian did not return a new access token. Please reconnect.")

    credential.access_token = encrypt_secret(access_token)
    # Atlassian uses rotating refresh tokens: the old one is invalidated on use.
    if tokens.get("refresh_token"):
        credential.refresh_token = encrypt_secret(tokens["refresh_token"])
    credential.expires_at = _expiry_from(tokens.get("expires_in"))
    if tokens.get("scope"):
        credential.scopes = tokens["scope"]
    db.add(credential)
    db.commit()
    return access_token


def get_access_token(db: Session, credential: IntegrationCredential) -> str:
    """Return a usable access token, refreshing it first if it is about to expire."""
    _require_config()
    if _is_expiring(credential):
        return _refresh(db, credential)

    access_token = decrypt_secret(credential.access_token)
    if not access_token:
        # Usually means JWT_SECRET changed, so the stored ciphertext can't be read.
        return _refresh(db, credential)
    return access_token


def disconnect(db: Session) -> bool:
    credential = get_credential(db)
    if not credential:
        return False
    db.delete(credential)
    db.commit()
    return True


def connection_status(db: Session) -> dict:
    """Everything the Integrations page needs to render the JIRA card."""
    settings = get_settings()
    credential = get_credential(db)
    api_token_ready = bool(settings.jira_base_url and settings.jira_email and settings.jira_api_token)

    if credential:
        auth_method = "oauth"
    elif api_token_ready:
        auth_method = "api_token"
    else:
        auth_method = "none"

    return {
        "connected": credential is not None or api_token_ready,
        "auth_method": auth_method,
        "oauth_available": oauth_configured(),
        "site_name": credential.site_name if credential else None,
        "site_url": credential.site_url if credential else (settings.jira_base_url or None),
        "account_name": credential.account_name if credential else None,
        "account_email": credential.account_email if credential else (settings.jira_email or None),
        "account_id": credential.account_id if credential else None,
        "scopes": credential.scopes.split() if credential and credential.scopes else [],
        "connected_at": credential.updated_at if credential else None,
        "project_key": settings.jira_project_key or None,
        "redirect_uri": settings.jira_oauth_redirect_uri,
    }
