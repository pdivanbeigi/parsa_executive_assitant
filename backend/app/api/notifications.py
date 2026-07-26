import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_username, get_db_session
from app.core.config import get_settings
from app.db.models import NotificationLog, Report, TeamMember
from app.schemas.notification import EmailNotificationRequest, NotificationLogOut, SlackNotificationRequest
from app.services import email_service, slack_service

router = APIRouter(
    prefix="/api/notifications", tags=["notifications"], dependencies=[Depends(get_current_username)]
)


@router.get("", response_model=list[NotificationLogOut])
def list_notifications(db: Session = Depends(get_db_session)) -> list[NotificationLog]:
    return list(db.scalars(select(NotificationLog).order_by(NotificationLog.id.desc()).limit(200)))


@router.post("/slack", response_model=NotificationLogOut, status_code=201)
def send_slack_notification(payload: SlackNotificationRequest, db: Session = Depends(get_db_session)):
    target = payload.channel
    if payload.team_member_id:
        member = db.get(TeamMember, payload.team_member_id)
        if not member:
            raise HTTPException(status_code=404, detail="Team member not found")
        if not member.slack_user_id:
            raise HTTPException(status_code=400, detail=f"{member.name} has no Slack user ID on file")
        target = member.slack_user_id

    if not target:
        raise HTTPException(status_code=400, detail="Provide either team_member_id or channel")

    log = NotificationLog(
        type="slack",
        recipient=target,
        subject=None,
        body=payload.message,
        related_meeting_id=payload.related_meeting_id,
        related_action_item_id=payload.related_action_item_id,
        status="sent",
    )
    try:
        slack_service.send_message(target, payload.message)
    except (slack_service.SlackNotConfiguredError, slack_service.SlackSendError) as exc:
        log.status = "failed"
        log.error_message = str(exc)
        db.add(log)
        db.commit()
        db.refresh(log)
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.post("/email", response_model=NotificationLogOut, status_code=201)
def send_email_notification(payload: EmailNotificationRequest, db: Session = Depends(get_db_session)):
    to_address = payload.email
    if payload.team_member_id:
        member = db.get(TeamMember, payload.team_member_id)
        if not member:
            raise HTTPException(status_code=404, detail="Team member not found")
        to_address = member.email

    if not to_address:
        raise HTTPException(status_code=400, detail="Provide either team_member_id or email")

    attachment_path = None
    attachment_filename = None
    if payload.attach_report_id:
        report = db.get(Report, payload.attach_report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        settings = get_settings()
        attachment_path = os.path.join(settings.reports_dir, report.pdf_path)
        attachment_filename = os.path.basename(report.pdf_path)

    log = NotificationLog(
        type="email",
        recipient=to_address,
        subject=payload.subject,
        body=payload.body,
        related_meeting_id=payload.related_meeting_id,
        related_action_item_id=payload.related_action_item_id,
        status="sent",
    )
    try:
        email_service.send_email(
            to=to_address,
            subject=payload.subject,
            body=payload.body,
            attachment_path=attachment_path,
            attachment_filename=attachment_filename,
        )
    except (email_service.EmailNotConfiguredError, email_service.EmailSendError) as exc:
        log.status = "failed"
        log.error_message = str(exc)
        db.add(log)
        db.commit()
        db.refresh(log)
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    db.add(log)
    db.commit()
    db.refresh(log)
    return log
