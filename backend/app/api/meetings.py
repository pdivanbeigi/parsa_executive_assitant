from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_username, get_db_session
from app.db.models import ActionItem, Meeting, TeamMember
from app.schemas.meeting import (
    MeetingCreate,
    MeetingListOut,
    MeetingOut,
    MeetingSummarizeRequest,
    MeetingUpdate,
)
from app.services import ai_service

router = APIRouter(prefix="/api/meetings", tags=["meetings"], dependencies=[Depends(get_current_username)])


def _get_meeting_or_404(meeting_id: int, db: Session) -> Meeting:
    meeting = db.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


def _resolve_attendees(attendee_ids: list[int], db: Session) -> list[TeamMember]:
    if not attendee_ids:
        return []
    members = list(db.scalars(select(TeamMember).where(TeamMember.id.in_(attendee_ids))))
    found_ids = {m.id for m in members}
    missing = set(attendee_ids) - found_ids
    if missing:
        raise HTTPException(status_code=400, detail=f"Unknown team member ids: {sorted(missing)}")
    return members


@router.get("", response_model=list[MeetingListOut])
def list_meetings(db: Session = Depends(get_db_session)) -> list[Meeting]:
    return list(db.scalars(select(Meeting).order_by(Meeting.meeting_date.desc(), Meeting.id.desc())))


@router.post("", response_model=MeetingOut, status_code=201)
def create_meeting(payload: MeetingCreate, db: Session = Depends(get_db_session)) -> Meeting:
    meeting = Meeting(
        title=payload.title,
        meeting_date=payload.meeting_date,
        raw_notes=payload.raw_notes,
        attendees=_resolve_attendees(payload.attendee_ids, db),
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.get("/{meeting_id}", response_model=MeetingOut)
def get_meeting(meeting_id: int, db: Session = Depends(get_db_session)) -> Meeting:
    return _get_meeting_or_404(meeting_id, db)


@router.put("/{meeting_id}", response_model=MeetingOut)
def update_meeting(meeting_id: int, payload: MeetingUpdate, db: Session = Depends(get_db_session)) -> Meeting:
    meeting = _get_meeting_or_404(meeting_id, db)
    meeting.title = payload.title
    meeting.meeting_date = payload.meeting_date
    meeting.raw_notes = payload.raw_notes
    if payload.status:
        meeting.status = payload.status
    meeting.attendees = _resolve_attendees(payload.attendee_ids, db)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.delete("/{meeting_id}", status_code=204)
def delete_meeting(meeting_id: int, db: Session = Depends(get_db_session)) -> None:
    meeting = _get_meeting_or_404(meeting_id, db)
    db.delete(meeting)
    db.commit()


@router.post("/{meeting_id}/summarize", response_model=MeetingOut)
def summarize_meeting(
    meeting_id: int, payload: MeetingSummarizeRequest, db: Session = Depends(get_db_session)
) -> Meeting:
    meeting = _get_meeting_or_404(meeting_id, db)
    if payload.raw_notes is not None:
        meeting.raw_notes = payload.raw_notes
    if not meeting.raw_notes:
        raise HTTPException(status_code=400, detail="Add some raw notes before generating a summary")

    existing_items = list(db.scalars(select(ActionItem).where(ActionItem.meeting_id == meeting_id)))

    try:
        summary = ai_service.summarize_meeting_notes(
            title=meeting.title,
            attendees=[a.name for a in meeting.attendees],
            raw_notes=meeting.raw_notes,
            existing_action_items=[item.description for item in existing_items],
        )
    except ai_service.AiNotConfiguredError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"AI summarization failed: {exc}") from exc

    meeting.ai_summary = summary
    db.commit()
    db.refresh(meeting)
    return meeting
