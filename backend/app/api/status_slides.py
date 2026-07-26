import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_username, get_db_session
from app.core.config import get_settings
from app.db.models import StatusSlide
from app.schemas.status_slide import StatusSlideCreate, StatusSlideOut, StatusSlideUpdate
from app.services import status_slide_service

router = APIRouter(
    prefix="/api/status-slides",
    tags=["status-slides"],
    dependencies=[Depends(get_current_username)],
)


def _as_dict(value) -> dict:
    return value.model_dump() if hasattr(value, "model_dump") else dict(value or {})


def _as_list(value) -> list:
    if value is None:
        return []
    if hasattr(value, "__iter__") and not isinstance(value, (str, bytes, dict)):
        return [item.model_dump() if hasattr(item, "model_dump") else item for item in value]
    return []


def _hydrate_slide_fields(payload_data: dict) -> dict:
    theme = status_slide_service.normalize_theme(_as_dict(payload_data.get("theme")))
    template = status_slide_service.normalize_template(_as_dict(payload_data.get("template")))
    sections = status_slide_service.normalize_sections(
        _as_list(payload_data.get("sections")),
        done_items=payload_data.get("done_items"),
        will_do_items=payload_data.get("will_do_items"),
        comments=payload_data.get("comments"),
        theme=theme,
    )
    done, will, comments = status_slide_service.sync_legacy_fields(sections)
    payload_data["theme"] = theme
    payload_data["template"] = template
    payload_data["sections"] = sections
    payload_data["done_items"] = done
    payload_data["will_do_items"] = will
    payload_data["comments"] = comments
    if "title" in payload_data and payload_data["title"] is not None:
        payload_data["title"] = str(payload_data["title"]).strip()
    return payload_data


def _apply_payload(slide: StatusSlide, payload: StatusSlideCreate | StatusSlideUpdate, *, partial: bool) -> None:
    data = _hydrate_slide_fields(payload.model_dump(exclude_unset=partial))
    for key, value in data.items():
        setattr(slide, key, value)


@router.get("", response_model=list[StatusSlideOut])
def list_status_slides(db: Session = Depends(get_db_session)) -> list[StatusSlide]:
    slides = list(db.scalars(select(StatusSlide).order_by(StatusSlide.updated_at.desc())))
    for slide in slides:
        if not slide.sections:
            slide.sections = status_slide_service.normalize_sections(
                None,
                done_items=slide.done_items,
                will_do_items=slide.will_do_items,
                comments=slide.comments,
                theme=slide.theme,
            )
        if not slide.template:
            slide.template = status_slide_service.normalize_template(None)
    return slides


@router.post("", response_model=StatusSlideOut, status_code=201)
def create_status_slide(payload: StatusSlideCreate, db: Session = Depends(get_db_session)) -> StatusSlide:
    data = _hydrate_slide_fields(payload.model_dump())
    slide = StatusSlide(**data)
    db.add(slide)
    db.commit()
    db.refresh(slide)
    return slide


@router.post("/preview-export")
def preview_export_status_slide(payload: StatusSlideCreate) -> FileResponse:
    """Generate a one-off PDF without saving the slide (useful while drafting)."""
    data = _hydrate_slide_fields(payload.model_dump())
    absolute, relative = status_slide_service.generate_status_slide_pdf(
        slide_id=None,
        title=data["title"],
        period_label=data.get("period_label"),
        author=data.get("author"),
        sections=data["sections"],
        template=data["template"],
        theme=data["theme"],
    )
    return FileResponse(absolute, media_type="application/pdf", filename=relative)


@router.get("/{slide_id}", response_model=StatusSlideOut)
def get_status_slide(slide_id: int, db: Session = Depends(get_db_session)) -> StatusSlide:
    slide = db.get(StatusSlide, slide_id)
    if not slide:
        raise HTTPException(status_code=404, detail="Status slide not found")
    if not slide.sections:
        slide.sections = status_slide_service.normalize_sections(
            None,
            done_items=slide.done_items,
            will_do_items=slide.will_do_items,
            comments=slide.comments,
            theme=slide.theme,
        )
    if not slide.template:
        slide.template = status_slide_service.normalize_template(None)
    return slide


@router.put("/{slide_id}", response_model=StatusSlideOut)
def update_status_slide(
    slide_id: int, payload: StatusSlideUpdate, db: Session = Depends(get_db_session)
) -> StatusSlide:
    slide = db.get(StatusSlide, slide_id)
    if not slide:
        raise HTTPException(status_code=404, detail="Status slide not found")
    _apply_payload(slide, payload, partial=True)
    db.commit()
    db.refresh(slide)
    return slide


@router.delete("/{slide_id}", status_code=204)
def delete_status_slide(slide_id: int, db: Session = Depends(get_db_session)) -> None:
    slide = db.get(StatusSlide, slide_id)
    if not slide:
        raise HTTPException(status_code=404, detail="Status slide not found")
    db.delete(slide)
    db.commit()


@router.post("/{slide_id}/export", response_model=StatusSlideOut)
def export_status_slide(slide_id: int, db: Session = Depends(get_db_session)) -> StatusSlide:
    slide = db.get(StatusSlide, slide_id)
    if not slide:
        raise HTTPException(status_code=404, detail="Status slide not found")

    sections = status_slide_service.normalize_sections(
        slide.sections,
        done_items=slide.done_items,
        will_do_items=slide.will_do_items,
        comments=slide.comments,
        theme=slide.theme,
    )
    template = status_slide_service.normalize_template(slide.template)

    _absolute, relative = status_slide_service.generate_status_slide_pdf(
        slide_id=slide.id,
        title=slide.title,
        period_label=slide.period_label,
        author=slide.author,
        sections=sections,
        template=template,
        theme=slide.theme or {},
    )
    slide.pdf_path = relative
    slide.sections = sections
    slide.template = template
    db.commit()
    db.refresh(slide)
    return slide


@router.get("/{slide_id}/download")
def download_status_slide(slide_id: int, db: Session = Depends(get_db_session)) -> FileResponse:
    slide = db.get(StatusSlide, slide_id)
    if not slide:
        raise HTTPException(status_code=404, detail="Status slide not found")
    if not slide.pdf_path:
        raise HTTPException(status_code=409, detail="Export the slide to PDF first.")
    settings = get_settings()
    absolute = os.path.join(settings.reports_dir, slide.pdf_path)
    if not os.path.exists(absolute):
        raise HTTPException(status_code=404, detail="Slide PDF missing on disk")
    return FileResponse(absolute, media_type="application/pdf", filename=os.path.basename(absolute))
