from datetime import date

from pydantic import BaseModel


class CountBucket(BaseModel):
    label: str
    count: int


class InsightKpis(BaseModel):
    meetings: int
    action_items_open: int
    action_items_overdue: int
    todos_open: int
    todos_overdue: int
    team_members: int


class InsightSummaryOut(BaseModel):
    generated_on: date
    kpis: InsightKpis
    action_items_by_status: list[CountBucket]
    action_items_by_assignee: list[CountBucket]
    todos_by_priority: list[CountBucket]
    todos_by_status: list[CountBucket]
    meetings_by_month: list[CountBucket]
    recent_meetings: list[dict]
    open_action_items: list[dict]
    open_todos: list[dict]
