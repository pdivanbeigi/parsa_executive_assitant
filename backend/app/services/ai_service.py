import json

from openai import OpenAI

from app.core.config import get_settings


class AiNotConfiguredError(Exception):
    pass


def _client() -> OpenAI:
    settings = get_settings()
    if not settings.openai_api_key:
        raise AiNotConfiguredError("OPENAI_API_KEY is not set in backend/.env")
    return OpenAI(api_key=settings.openai_api_key)


def summarize_meeting_notes(
    title: str,
    attendees: list[str],
    raw_notes: str,
    existing_action_items: list[str] | None = None,
) -> dict:
    """Turn raw meeting notes into structured minutes using an LLM."""
    settings = get_settings()
    client = _client()

    system_prompt = (
        "You are an executive assistant who writes crisp, structured meeting minutes for a "
        "engineering leadership audience. Always respond with strict JSON matching the requested schema. "
        "Be concise: use short, specific bullet points, not paragraphs."
    )
    user_prompt = {
        "meeting_title": title,
        "attendees": attendees,
        "raw_notes": raw_notes,
        "existing_action_items": existing_action_items or [],
        "instructions": (
            "Summarize the raw notes into JSON with keys: "
            "'key_decisions' (list of strings), "
            "'discussion_highlights' (list of strings), "
            "'risks_or_blockers' (list of strings), "
            "'suggested_action_items' (list of objects with 'description' and optional 'owner' string), "
            "'next_steps' (list of strings)."
        ),
    }

    response = client.chat.completions.create(
        model=settings.openai_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_prompt)},
        ],
    )
    content = response.choices[0].message.content or "{}"
    return json.loads(content)


def condense_for_report(
    title: str,
    meeting_date: str,
    ai_summary: dict | None,
    action_items: list[dict],
) -> dict:
    """Condense minutes + action items into content for a one-slide executive report."""
    settings = get_settings()
    client = _client()

    system_prompt = (
        "You produce content for a single executive summary slide. Be extremely concise: this must fit "
        "on ONE page. Always respond with strict JSON matching the requested schema."
    )
    user_prompt = {
        "meeting_title": title,
        "meeting_date": meeting_date,
        "summary": ai_summary or {},
        "action_items": action_items,
        "instructions": (
            "Return JSON with keys: "
            "'headline' (one short sentence capturing the meeting outcome), "
            "'key_points' (max 4 short bullet strings), "
            "'risks' (max 3 short bullet strings, empty list if none), "
            "'next_steps' (max 3 short bullet strings)."
        ),
    }

    response = client.chat.completions.create(
        model=settings.openai_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_prompt)},
        ],
    )
    content = response.choices[0].message.content or "{}"
    return json.loads(content)
