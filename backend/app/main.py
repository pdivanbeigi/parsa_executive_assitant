from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    action_items,
    auth,
    insights,
    jira,
    meetings,
    notifications,
    reports,
    status_slides,
    team_members,
    todos,
    whiteboards,
)
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="Executive Assistant API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(team_members.router)
app.include_router(jira.router)
app.include_router(jira.callback_router)
app.include_router(meetings.router)
app.include_router(action_items.router)
app.include_router(action_items.item_router)
app.include_router(reports.router)
app.include_router(insights.router)
app.include_router(status_slides.router)
app.include_router(notifications.router)
app.include_router(todos.router)
app.include_router(whiteboards.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
