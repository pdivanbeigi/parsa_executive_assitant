"""Convert a small subset of inline Markdown into ReportLab Paragraph markup."""

from __future__ import annotations

import html
import re


_CODE = re.compile(r"`([^`]+)`")
_BOLD = re.compile(r"(\*\*|__)(.+?)\1")
_ITALIC = re.compile(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)")
_STRIKE = re.compile(r"~~(.+?)~~")
_LINK = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def markdown_to_reportlab(text: str) -> str:
    """Turn inline markdown into ReportLab-safe rich text (bold/italic/code/links)."""
    if not text:
        return ""

    placeholders: list[str] = []

    def stash(value: str) -> str:
        placeholders.append(value)
        return f"\x00{len(placeholders) - 1}\x00"

    # Protect code spans before escaping/formatting the rest.
    def replace_code(match: re.Match[str]) -> str:
        code = html.escape(match.group(1), quote=False)
        return stash(f'<font face="Courier" size="9">{code}</font>')

    working = _CODE.sub(replace_code, text)
    working = html.escape(working, quote=False)

    def replace_link(match: re.Match[str]) -> str:
        label = match.group(1)
        href = match.group(2).replace('"', "")
        return stash(f'<link href="{href}"><u>{label}</u></link>')

    working = _LINK.sub(replace_link, working)
    working = _BOLD.sub(r"<b>\2</b>", working)
    working = _STRIKE.sub(r'<font color="#94a3b8"><u>\1</u></font>', working)

    def replace_italic(match: re.Match[str]) -> str:
        content = match.group(1) or match.group(2) or ""
        return f"<i>{content}</i>"

    working = _ITALIC.sub(replace_italic, working)

    for index, value in enumerate(placeholders):
        working = working.replace(f"\x00{index}\x00", value)

    return working.replace("\n", "<br/>")
