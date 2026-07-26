from datetime import datetime

from sqlalchemy import DateTime, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class StatusSlide(Base):
    """One-page status slide with a customizable multi-section template."""

    __tablename__ = "status_slides"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    period_label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    author: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Legacy fields kept in sync with the first three sections for older clients.
    done_items: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    will_do_items: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    comments: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    sections: Mapped[list | None] = mapped_column(JSON, nullable=True)
    template: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    theme: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    pdf_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
