from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_username, get_db_session
from app.db.models.todo import Todo
from app.schemas.todo import TodoCreate, TodoOut, TodoUpdate

router = APIRouter(prefix="/api/todos", tags=["todos"], dependencies=[Depends(get_current_username)])


@router.get("", response_model=list[TodoOut])
def list_todos(
    include_completed: bool = Query(True),
    db: Session = Depends(get_db_session),
) -> list[Todo]:
    stmt = select(Todo).order_by(Todo.completed.asc(), Todo.due_date.asc().nulls_last(), Todo.id.desc())
    if not include_completed:
        stmt = stmt.where(Todo.completed.is_(False))
    return list(db.scalars(stmt))


@router.post("", response_model=TodoOut, status_code=201)
def create_todo(payload: TodoCreate, db: Session = Depends(get_db_session)) -> Todo:
    todo = Todo(
        title=payload.title.strip(),
        notes=payload.notes,
        due_date=payload.due_date,
        priority=payload.priority,
        completed=False,
    )
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


@router.patch("/{todo_id}", response_model=TodoOut)
def update_todo(todo_id: int, payload: TodoUpdate, db: Session = Depends(get_db_session)) -> Todo:
    todo = db.get(Todo, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    data = payload.model_dump(exclude_unset=True)
    if "title" in data and data["title"] is not None:
        data["title"] = data["title"].strip()
    for key, value in data.items():
        setattr(todo, key, value)
    db.commit()
    db.refresh(todo)
    return todo


@router.delete("/{todo_id}", status_code=204)
def delete_todo(todo_id: int, db: Session = Depends(get_db_session)) -> None:
    todo = db.get(Todo, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    db.delete(todo)
    db.commit()
