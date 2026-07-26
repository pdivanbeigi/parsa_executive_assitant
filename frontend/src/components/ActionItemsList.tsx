import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { actionItemsApi, type ActionItemInput } from "../api/actionItems";
import type { ActionItem, TeamMember } from "../api/types";

const statusOptions = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

function toInput(item: ActionItem): ActionItemInput {
  return {
    description: item.description,
    assignee_id: item.assignee?.id ?? null,
    due_date: item.due_date,
    status: item.status,
    jira_issue_key: item.jira_issue_key,
    jira_issue_summary: item.jira_issue_summary,
  };
}

export default function ActionItemsList({
  meetingId,
  teamMembers,
  onRemind,
}: {
  meetingId: number;
  teamMembers: TeamMember[];
  onRemind: (item: ActionItem) => void;
}) {
  const queryClient = useQueryClient();
  const { setNodeRef, isOver } = useDroppable({ id: "action-items-dropzone" });
  const [newDescription, setNewDescription] = useState("");

  const { data: items } = useQuery({
    queryKey: ["action-items", meetingId],
    queryFn: () => actionItemsApi.list(meetingId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["action-items", meetingId] });

  const createMutation = useMutation({
    mutationFn: (input: ActionItemInput) => actionItemsApi.create(meetingId, input),
    onSuccess: invalidate,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: ActionItemInput }) => actionItemsApi.update(id, input),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: actionItemsApi.remove,
    onSuccess: invalidate,
  });

  function addManualItem() {
    if (!newDescription.trim()) return;
    createMutation.mutate({ description: newDescription.trim(), status: "open" });
    setNewDescription("");
  }

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "flex h-full flex-col rounded-xl border-2 border-dashed bg-white p-4 shadow-sm transition",
        isOver ? "border-brand-400 bg-brand-50" : "border-transparent",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">Action Items</h2>
        <span className="text-[11px] text-slate-400">Drop JIRA tasks here</span>
      </div>

      <div className="mb-3 flex gap-2">
        <input
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addManualItem()}
          placeholder="Add an action item manually..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={addManualItem}
          className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900"
        >
          Add
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {items?.length === 0 && (
          <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-400">
            No action items yet. Drag a JIRA task here or add one manually.
          </p>
        )}
        {items?.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                {item.jira_issue_key && (
                  <span className="mr-2 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                    {item.jira_issue_key}
                  </span>
                )}
                <span className="text-sm text-slate-800">{item.description}</span>
              </div>
              <button
                onClick={() => deleteMutation.mutate(item.id)}
                className="text-xs text-slate-400 hover:text-red-600"
              >
                Remove
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={item.assignee?.id ?? ""}
                onChange={(e) =>
                  updateMutation.mutate({
                    id: item.id,
                    input: { ...toInput(item), assignee_id: e.target.value ? Number(e.target.value) : null },
                  })
                }
                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={item.due_date ?? ""}
                onChange={(e) =>
                  updateMutation.mutate({ id: item.id, input: { ...toInput(item), due_date: e.target.value || null } })
                }
                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
              />
              <select
                value={item.status}
                onChange={(e) =>
                  updateMutation.mutate({ id: item.id, input: { ...toInput(item), status: e.target.value } })
                }
                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => onRemind(item)}
                disabled={!item.assignee}
                title={item.assignee ? "Send a reminder" : "Assign someone first"}
                className="ml-auto rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-40"
              >
                Remind
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
