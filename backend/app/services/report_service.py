import os
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.core.config import get_settings

BRAND_COLOR = colors.HexColor("#1f45f0")
MUTED_COLOR = colors.HexColor("#6b7280")
RISK_COLOR = colors.HexColor("#b91c1c")
PAGE_SIZE = landscape(letter)


def _styles() -> dict:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "SlideTitle", parent=base["Title"], alignment=0, textColor=colors.white, fontSize=22, leading=26
        ),
        "meta": ParagraphStyle("SlideMeta", parent=base["Normal"], textColor=colors.white, fontSize=10),
        "headline": ParagraphStyle(
            "Headline", parent=base["Heading2"], textColor=BRAND_COLOR, fontSize=14, spaceAfter=10
        ),
        "section": ParagraphStyle(
            "Section", parent=base["Heading3"], fontSize=11, textColor=colors.HexColor("#111827"), spaceAfter=4
        ),
        "bullet": ParagraphStyle("Bullet", parent=base["Normal"], fontSize=9.5, leading=13),
        "risk_bullet": ParagraphStyle("RiskBullet", parent=base["Normal"], fontSize=9.5, leading=13, textColor=RISK_COLOR),
        "small_muted": ParagraphStyle("SmallMuted", parent=base["Normal"], fontSize=8.5, textColor=MUTED_COLOR),
    }


def _header_table(title: str, meeting_date: str, attendees: list[str]) -> Table:
    styles = _styles()
    attendees_text = ", ".join(attendees) if attendees else "No attendees recorded"
    cell = [
        Paragraph(title, styles["title"]),
        Spacer(1, 4),
        Paragraph(f"{meeting_date} &nbsp;&middot;&nbsp; Attendees: {attendees_text}", styles["meta"]),
    ]
    table = Table([[cell]], colWidths=[PAGE_SIZE[0] - 0.8 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), BRAND_COLOR),
                ("LEFTPADDING", (0, 0), (-1, -1), 18),
                ("RIGHTPADDING", (0, 0), (-1, -1), 18),
                ("TOPPADDING", (0, 0), (-1, -1), 14),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
            ]
        )
    )
    return table


def _bullet_list(items: list[str], style: ParagraphStyle) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(item, style), leftIndent=6) for item in items],
        bulletType="bullet",
        start="circle",
        leftIndent=12,
    )


def generate_meeting_report_pdf(
    meeting_id: int,
    title: str,
    meeting_date: str,
    attendees: list[str],
    ai_content: dict,
    action_items: list[dict],
) -> tuple[str, str]:
    """Renders a one-page landscape executive summary PDF. Returns (absolute_path, relative_path)."""
    settings = get_settings()
    os.makedirs(settings.reports_dir, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    filename = f"meeting_{meeting_id}_report_{timestamp}.pdf"
    relative_path = filename
    absolute_path = os.path.join(settings.reports_dir, filename)

    styles = _styles()
    doc = SimpleDocTemplate(
        absolute_path,
        pagesize=PAGE_SIZE,
        leftMargin=0.4 * inch,
        rightMargin=0.4 * inch,
        topMargin=0.4 * inch,
        bottomMargin=0.4 * inch,
        title=f"{title} - Executive Summary",
    )

    story = [_header_table(title, meeting_date, attendees), Spacer(1, 14)]

    headline = ai_content.get("headline")
    if headline:
        story.append(Paragraph(headline, styles["headline"]))

    key_points = ai_content.get("key_points") or []
    risks = ai_content.get("risks") or []
    next_steps = ai_content.get("next_steps") or []

    left_col: list = []
    if key_points:
        left_col.append(Paragraph("Key Points", styles["section"]))
        left_col.append(_bullet_list(key_points, styles["bullet"]))
        left_col.append(Spacer(1, 8))
    if next_steps:
        left_col.append(Paragraph("Next Steps", styles["section"]))
        left_col.append(_bullet_list(next_steps, styles["bullet"]))

    right_col: list = []
    if risks:
        right_col.append(Paragraph("Risks / Blockers", styles["section"]))
        right_col.append(_bullet_list(risks, styles["risk_bullet"]))
        right_col.append(Spacer(1, 8))

    if action_items:
        right_col.append(Paragraph("Action Items", styles["section"]))
        table_data = [["Owner", "Task", "Due", "Status"]]
        for item in action_items[:8]:
            table_data.append(
                [
                    item.get("owner") or "Unassigned",
                    item.get("description", "")[:70],
                    item.get("due_date") or "-",
                    item.get("status", "open").replace("_", " ").title(),
                ]
            )
        action_table = Table(table_data, colWidths=[0.9 * inch, 2.6 * inch, 0.7 * inch, 0.8 * inch])
        action_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef1fb")),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        right_col.append(action_table)

    content_table = Table([[left_col, right_col]], colWidths=[(PAGE_SIZE[0] - 0.8 * inch) / 2] * 2)
    content_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (1, 0), (1, 0), 16)]))
    story.append(content_table)

    story.append(Spacer(1, 10))
    story.append(Paragraph("Generated by Executive Assistant", styles["small_muted"]))

    doc.build(story)
    return absolute_path, relative_path
