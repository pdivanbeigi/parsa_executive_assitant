from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_username, get_db_session
from app.db.models import ActionItem, Meeting, TeamMember
from app.schemas.action_item import ActionItemCreate, ActionItemOut, ActionItemUpdate

router = APIRouter(prefix="/api/meetings/{meeting_id}/action-items", tags=["action-items"])
item_router = APIRouter(prefix="/api/action-items", tags=["action-items"])


def _get_meeting_or_404(meeting_id: int, db: Session) -> Meeting:
    meeting = db.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


def _validate_assignee(assignee_id: int | None, db: Session) -> None:
    if assignee_id is not None and not db.get(TeamMember, assignee_id):
        raise HTTPException(status_code=400, detail="Unknown assignee id")


@router.get("", response_model=list[ActionItemOut], dependencies=[Depends(get_current_username)])
def list_action_items(meeting_id: int, db: Session = Depends(get_db_session)) -> list[ActionItem]:
    _get_meeting_or_404(meeting_id, db)
    return list(db.scalars(select(ActionItem).where(ActionItem.meeting_id == meeting_id).order_by(ActionItem.id)))


@router.post("", response_model=ActionItemOut, status_code=201, dependencies=[Depends(get_current_username)])
def create_action_item(
    meeting_id: int, payload: ActionItemCreate, db: Session = Depends(get_db_session)
) -> ActionItem:
    _get_meeting_or_404(meeting_id, db)
    _validate_assignee(payload.assignee_id, db)
    item = ActionItem(meeting_id=meeting_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@item_router.put("/{item_id}", response_model=ActionItemOut, dependencies=[Depends(get_current_username)])
def update_action_item(item_id: int, payload: ActionItemUpdate, db: Session = Depends(get_db_session)) -> ActionItem:
    item = db.get(ActionItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")
    _validate_assignee(payload.assignee_id, db)
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@item_router.delete("/{item_id}", status_code=204, dependencies=[Depends(get_current_username)])
def delete_action_item(item_id: int, db: Session = Depends(get_db_session)) -> None:
    item = db.get(ActionItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")
    db.delete(item)
    db.commit()
