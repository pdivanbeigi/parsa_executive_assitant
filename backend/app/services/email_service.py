import smtplib
from email.message import EmailMessage

from app.core.config import get_settings


class EmailNotConfiguredError(Exception):
    pass


class EmailSendError(Exception):
    pass


def send_email(
    to: str,
    subject: str,
    body: str,
    attachment_path: str | None = None,
    attachment_filename: str | None = None,
) -> None:
    settings = get_settings()
    if not (settings.smtp_host and settings.smtp_user and settings.smtp_password):
        raise EmailNotConfiguredError("SMTP settings are not fully configured in backend/.env")

    message = EmailMessage()
    message["From"] = settings.smtp_from or settings.smtp_user
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    if attachment_path:
        with open(attachment_path, "rb") as f:
            data = f.read()
        message.add_attachment(
            data,
            maintype="application",
            subtype="pdf",
            filename=attachment_filename or "attachment.pdf",
        )

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(message)
    except smtplib.SMTPException as exc:
        raise EmailSendError(f"Failed to send email: {exc}") from exc
