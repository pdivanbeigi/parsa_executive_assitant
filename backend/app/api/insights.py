from collections import Counter
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_username, get_db_session
from app.db.models import ActionItem, Meeting, TeamMember, Todo
from app.schemas.insight import CountBucket, InsightKpis, InsightSummaryOut

router = APIRouter(
    prefix="/api/insights",
    tags=["insights"],
    dependencies=[Depends(get_current_username)],
)


def _bucket(counter: Counter[str], *, order: list[str] | None = None) -> list[CountBucket]:
    if order:
        return [CountBucket(label=label, count=counter.get(label, 0)) for label in order]
    return [
        CountBucket(label=label, count=count)
        for label, count in sorted(counter.items(), key=lambda item: (-item[1], item[0]))
    ]


@router.get("/summary", response_model=InsightSummaryOut)
def get_insight_summary(db: Session = Depends(get_db_session)) -> InsightSummaryOut:
    today = date.today()

    meetings = list(db.scalars(select(Meeting).order_by(Meeting.meeting_date.desc())))
    action_items = list(
        db.scalars(
            select(ActionItem).options(joinedload(ActionItem.assignee)).order_by(ActionItem.id.desc())
        ).unique()
    )
    todos = list(db.scalars(select(Todo).order_by(Todo.id.desc())))
    team_members = db.scalar(select(func.count()).select_from(TeamMember)) or 0

    status_counts: Counter[str] = Counter(item.status for item in action_items)
    assignee_counts: Counter[str] = Counter(
        (item.assignee.name if item.assignee else "Unassigned") for item in action_items if item.status != "done"
    )
    todo_priority_counts: Counter[str] = Counter(todo.priority for todo in todos if not todo.completed)
    todo_status_counts: Counter[str] = Counter(
        "completed" if todo.completed else "open" for todo in todos
    )

    meetings_by_month: Counter[str] = Counter()
    for meeting in meetings:
        meetings_by_month[meeting.meeting_date.strftime("%Y-%m")] += 1
    # Chronological order for the time series
    month_buckets = [
        CountBucket(label=label, count=meetings_by_month[label])
        for label in sorted(meetings_by_month.keys())
    ]

    open_action_items = [item for item in action_items if item.status != "done"]
    overdue_action_items = [
        item for item in open_action_items if item.due_date is not None and item.due_date < today
    ]
    open_todos = [todo for todo in todos if not todo.completed]
    overdue_todos = [todo for todo in open_todos if todo.due_date is not None and todo.due_date < today]

    return InsightSummaryOut(
        generated_on=today,
        kpis=InsightKpis(
            meetings=len(meetings),
            action_items_open=len(open_action_items),
            action_items_overdue=len(overdue_action_items),
            todos_open=len(open_todos),
            todos_overdue=len(overdue_todos),
            team_members=int(team_members),
        ),
        action_items_by_status=_bucket(
            status_counts, order=["open", "in_progress", "done"]
        ),
        action_items_by_assignee=_bucket(assignee_counts)[:8],
        todos_by_priority=_bucket(todo_priority_counts, order=["high", "medium", "low"]),
        todos_by_status=_bucket(todo_status_counts, order=["open", "completed"]),
        meetings_by_month=month_buckets[-12:],
        recent_meetings=[
            {
                "id": meeting.id,
                "title": meeting.title,
                "meeting_date": meeting.meeting_date.isoformat(),
                "status": meeting.status,
                "action_item_count": sum(1 for item in action_items if item.meeting_id == meeting.id),
            }
            for meeting in meetings[:8]
        ],
        open_action_items=[
            {
                "id": item.id,
                "description": item.description,
                "status": item.status,
                "due_date": item.due_date.isoformat() if item.due_date else None,
                "assignee": item.assignee.name if item.assignee else None,
                "meeting_id": item.meeting_id,
                "overdue": bool(item.due_date and item.due_date < today),
            }
            for item in open_action_items[:12]
        ],
        open_todos=[
            {
                "id": todo.id,
                "title": todo.title,
                "priority": todo.priority,
                "due_date": todo.due_date.isoformat() if todo.due_date else None,
                "overdue": bool(todo.due_date and todo.due_date < today),
            }
            for todo in open_todos[:12]
        ],
    )
