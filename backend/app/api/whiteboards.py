from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_username, get_db_session
from app.db.models import Meeting, Whiteboard
from app.schemas.whiteboard import WhiteboardCreate, WhiteboardListOut, WhiteboardOut, WhiteboardUpdate

router = APIRouter(prefix="/api/whiteboards", tags=["whiteboards"], dependencies=[Depends(get_current_username)])

EMPTY_BOARD: dict = {"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}


@router.get("", response_model=list[WhiteboardListOut])
def list_whiteboards(meeting_id: int | None = None, db: Session = Depends(get_db_session)) -> list[Whiteboard]:
    stmt = select(Whiteboard).order_by(Whiteboard.updated_at.desc())
    if meeting_id is not None:
        stmt = stmt.where(Whiteboard.meeting_id == meeting_id)
    return list(db.scalars(stmt))


@router.post("", response_model=WhiteboardOut, status_code=201)
def create_whiteboard(payload: WhiteboardCreate, db: Session = Depends(get_db_session)) -> Whiteboard:
    if payload.meeting_id and not db.get(Meeting, payload.meeting_id):
        raise HTTPException(status_code=400, detail="Unknown meeting id")
    board = Whiteboard(title=payload.title, meeting_id=payload.meeting_id, data=payload.data or EMPTY_BOARD)
    db.add(board)
    db.commit()
    db.refresh(board)
    return board


@router.get("/{whiteboard_id}", response_model=WhiteboardOut)
def get_whiteboard(whiteboard_id: int, db: Session = Depends(get_db_session)) -> Whiteboard:
    board = db.get(Whiteboard, whiteboard_id)
    if not board:
        raise HTTPException(status_code=404, detail="Whiteboard not found")
    return board


@router.put("/{whiteboard_id}", response_model=WhiteboardOut)
def update_whiteboard(whiteboard_id: int, payload: WhiteboardUpdate, db: Session = Depends(get_db_session)) -> Whiteboard:
    board = db.get(Whiteboard, whiteboard_id)
    if not board:
        raise HTTPException(status_code=404, detail="Whiteboard not found")
    board.title = payload.title
    board.data = payload.data
    db.commit()
    db.refresh(board)
    return board


@router.delete("/{whiteboard_id}", status_code=204)
def delete_whiteboard(whiteboard_id: int, db: Session = Depends(get_db_session)) -> None:
    board = db.get(Whiteboard, whiteboard_id)
    if not board:
        raise HTTPException(status_code=404, detail="Whiteboard not found")
    db.delete(board)
    db.commit()
