import { useDraggable } from "@dnd-kit/core";
import clsx from "clsx";
import type { JiraIssue } from "../api/types";

const statusColor: Record<string, string> = {
  "to do": "bg-slate-100 text-slate-600",
  "in progress": "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};

export default function JiraTaskCard({ issue }: { issue: JiraIssue }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `jira-${issue.key}`,
    data: { issue },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const statusKey = (issue.status ?? "").toLowerCase();
  const badgeClass = statusColor[statusKey] ?? "bg-slate-100 text-slate-600";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={clsx(
        "cursor-grab touch-none rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition active:cursor-grabbing",
        isDragging && "z-50 opacity-70 shadow-lg",
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <a
          href={issue.url ?? undefined}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-semibold text-brand-600 hover:underline"
        >
          {issue.key}
        </a>
        {issue.status && (
          <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-medium", badgeClass)}>
            {issue.status}
          </span>
        )}
      </div>
      <p className="mb-1 text-sm text-slate-800">{issue.summary}</p>
      <p className="text-xs text-slate-400">{issue.assignee_name ?? "Unassigned"}</p>
    </div>
  );
}
