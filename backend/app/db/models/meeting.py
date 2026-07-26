from datetime import date, datetime
from enum import Enum

from sqlalchemy import JSON, Column, Date, DateTime, ForeignKey, String, Table, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class MeetingStatus(str, Enum):
    draft = "draft"
    finalized = "finalized"


meeting_attendees = Table(
    "meeting_attendees",
    Base.metadata,
    Column("meeting_id", ForeignKey("meetings.id"), primary_key=True),
    Column("team_member_id", ForeignKey("team_members.id"), primary_key=True),
)


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    meeting_date: Mapped[date] = mapped_column(Date, nullable=False)
    raw_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_summary: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default=MeetingStatus.draft.value)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    attendees: Mapped[list["TeamMember"]] = relationship(  # noqa: F821
        secondary=meeting_attendees
    )
    action_items: Mapped[list["ActionItem"]] = relationship(  # noqa: F821
        back_populates="meeting", cascade="all, delete-orphan", order_by="ActionItem.id"
    )
    reports: Mapped[list["Report"]] = relationship(  # noqa: F821
        back_populates="meeting", cascade="all, delete-orphan", order_by="Report.id"
    )
