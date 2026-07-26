from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App / auth
    jwt_secret: str = "change-me"
    jwt_expire_minutes: int = 1440
    admin_username: str = "admin"
    admin_password: str = "admin"

    # Database
    database_url: str = "postgresql+psycopg2://exec_assistant:exec_assistant@localhost:5432/exec_assistant"

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # JIRA — OAuth 2.0 (3LO): users connect by signing in with their Atlassian account
    jira_client_id: str = ""
    jira_client_secret: str = ""
    jira_oauth_redirect_uri: str = "http://localhost:8000/api/jira/oauth/callback"
    jira_oauth_scopes: str = "read:jira-work read:jira-user offline_access"

    # JIRA — API token fallback, used only when OAuth is not connected
    jira_base_url: str = ""
    jira_email: str = ""
    jira_api_token: str = ""
    jira_project_key: str = ""

    # Slack
    slack_bot_token: str = ""

    # SMTP
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    # Files
    reports_dir: str = "./generated_reports"

    # CORS
    frontend_origin: str = "http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()
