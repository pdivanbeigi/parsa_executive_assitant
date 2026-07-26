from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

from app.core.config import get_settings


class SlackNotConfiguredError(Exception):
    pass


class SlackSendError(Exception):
    pass


def send_message(target: str, text: str) -> None:
    """Send a Slack message. `target` may be a user ID (sends a DM) or a channel ID/name."""
    settings = get_settings()
    if not settings.slack_bot_token:
        raise SlackNotConfiguredError("SLACK_BOT_TOKEN is not set in backend/.env")

    client = WebClient(token=settings.slack_bot_token)
    try:
        client.chat_postMessage(channel=target, text=text)
    except SlackApiError as exc:
        message = exc.response.get("error", str(exc)) if exc.response else str(exc)
        raise SlackSendError(f"Slack API error: {message}") from exc
