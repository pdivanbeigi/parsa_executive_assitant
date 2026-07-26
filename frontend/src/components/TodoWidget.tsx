import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { todosApi } from "../api/todos";
import type { Todo } from "../api/types";

const priorityStyles: Record<string, string> = {
  high: "bg-red-50 text-red-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

export default function TodoWidget() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ["todos", showCompleted],
    queryFn: () => todosApi.list(showCompleted),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["todos"] });

  const createMutation = useMutation({
    mutationFn: todosApi.create,
    onSuccess: () => {
      setTitle("");
      setDueDate("");
      setPriority("medium");
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: Parameters<typeof todosApi.update>[1] }) =>
      todosApi.update(id, input),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: todosApi.remove,
    onSuccess: invalidate,
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || createMutation.isPending) return;
    createMutation.mutate({
      title: trimmed,
      priority,
      due_date: dueDate || null,
    });
  }

  const openCount = todos.filter((t) => !t.completed).length;

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm lg:col-span-3">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">My To-Dos</h2>
          <p className="text-xs text-slate-400">
            {openCount} open{todos.length ? ` · ${todos.length} total shown` : ""}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="rounded border-slate-300"
          />
          Show completed
        </label>
      </div>

      <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a to-do..."
          className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!title.trim() || createMutation.isPending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {isLoading && <p className="text-sm text-slate-400">Loading to-dos...</p>}
      {!isLoading && todos.length === 0 && (
        <p className="text-sm text-slate-400">No to-dos yet. Add your first one above.</p>
      )}

      <ul className="space-y-2">
        {todos.map((todo) => (
          <TodoRow
            key={todo.id}
            todo={todo}
            onToggle={() => updateMutation.mutate({ id: todo.id, input: { completed: !todo.completed } })}
            onDelete={() => deleteMutation.mutate(todo.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function TodoRow({
  todo,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      className={clsx(
        "flex items-start gap-3 rounded-lg border border-slate-100 px-3 py-2.5",
        todo.completed && "bg-slate-50 opacity-70",
      )}
    >
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={onToggle}
        className="mt-1 h-4 w-4 rounded border-slate-300"
      />
      <div className="min-w-0 flex-1">
        <p className={clsx("text-sm text-slate-800", todo.completed && "line-through text-slate-400")}>
          {todo.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span
            className={clsx(
              "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
              priorityStyles[todo.priority] ?? priorityStyles.medium,
            )}
          >
            {todo.priority}
          </span>
          {todo.due_date && (
            <span className="text-[11px] text-slate-400">Due {todo.due_date}</span>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="text-xs font-semibold text-slate-400 hover:text-red-600"
        title="Delete"
      >
        Delete
      </button>
    </li>
  );
}
