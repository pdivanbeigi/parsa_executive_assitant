import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_username, get_db_session
from app.core.config import get_settings
from app.db.models import ActionItem, Meeting, Report
from app.schemas.report import ReportOut
from app.services import ai_service, report_service

router = APIRouter(tags=["reports"], dependencies=[Depends(get_current_username)])


@router.post("/api/meetings/{meeting_id}/report", response_model=ReportOut, status_code=201)
def generate_report(meeting_id: int, db: Session = Depends(get_db_session)) -> Report:
    meeting = db.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    action_items = list(db.scalars(select(ActionItem).where(ActionItem.meeting_id == meeting_id)))
    action_items_payload = [
        {
            "description": item.description,
            "owner": item.assignee.name if item.assignee else None,
            "due_date": item.due_date.isoformat() if item.due_date else None,
            "status": item.status,
        }
        for item in action_items
    ]

    try:
        ai_content = ai_service.condense_for_report(
            title=meeting.title,
            meeting_date=meeting.meeting_date.isoformat(),
            ai_summary=meeting.ai_summary,
            action_items=action_items_payload,
        )
    except ai_service.AiNotConfiguredError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"AI report generation failed: {exc}") from exc

    _absolute_path, relative_path = report_service.generate_meeting_report_pdf(
        meeting_id=meeting.id,
        title=meeting.title,
        meeting_date=meeting.meeting_date.isoformat(),
        attendees=[a.name for a in meeting.attendees],
        ai_content=ai_content,
        action_items=action_items_payload,
    )

    report = Report(meeting_id=meeting_id, pdf_path=relative_path, ai_content=ai_content)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/api/meetings/{meeting_id}/reports", response_model=list[ReportOut])
def list_reports(meeting_id: int, db: Session = Depends(get_db_session)) -> list[Report]:
    return list(db.scalars(select(Report).where(Report.meeting_id == meeting_id).order_by(Report.id.desc())))


@router.get("/api/reports/{report_id}/download")
def download_report(report_id: int, db: Session = Depends(get_db_session)) -> FileResponse:
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    settings = get_settings()
    absolute_path = os.path.join(settings.reports_dir, report.pdf_path)
    if not os.path.exists(absolute_path):
        raise HTTPException(status_code=404, detail="Report file missing on disk")
    return FileResponse(absolute_path, media_type="application/pdf", filename=os.path.basename(absolute_path))
