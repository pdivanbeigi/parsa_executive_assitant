from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_username, get_db_session
from app.db.models import TeamMember
from app.schemas.team_member import TeamMemberCreate, TeamMemberOut, TeamMemberUpdate

router = APIRouter(
    prefix="/api/team-members", tags=["team-members"], dependencies=[Depends(get_current_username)]
)


@router.get("", response_model=list[TeamMemberOut])
def list_team_members(db: Session = Depends(get_db_session)) -> list[TeamMember]:
    return list(db.scalars(select(TeamMember).order_by(TeamMember.name)))


@router.post("", response_model=TeamMemberOut, status_code=201)
def create_team_member(payload: TeamMemberCreate, db: Session = Depends(get_db_session)) -> TeamMember:
    existing = db.scalar(select(TeamMember).where(TeamMember.email == payload.email))
    if existing:
        raise HTTPException(status_code=400, detail="A team member with this email already exists")
    member = TeamMember(**payload.model_dump())
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.put("/{member_id}", response_model=TeamMemberOut)
def update_team_member(
    member_id: int, payload: TeamMemberUpdate, db: Session = Depends(get_db_session)
) -> TeamMember:
    member = db.get(TeamMember, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    for key, value in payload.model_dump().items():
        setattr(member, key, value)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{member_id}", status_code=204)
def delete_team_member(member_id: int, db: Session = Depends(get_db_session)) -> None:
    member = db.get(TeamMember, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    db.delete(member)
    db.commit()
