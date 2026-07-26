import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { whiteboardsApi } from "../api/whiteboards";

export default function WhiteboardList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const { data: whiteboards, isLoading } = useQuery({ queryKey: ["whiteboards"], queryFn: () => whiteboardsApi.list() });

  const createMutation = useMutation({
    mutationFn: () => whiteboardsApi.create(newTitle.trim() || "Untitled Architecture"),
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: ["whiteboards"] });
      navigate(`/whiteboards/${board.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: whiteboardsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whiteboards"] }),
  });

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Whiteboards</h1>
        <p className="text-sm text-slate-500">
          Sketch AWS architectures live — great for screen-sharing during design discussions.
        </p>
      </div>

      <div className="mb-6 flex gap-2 rounded-xl bg-white p-4 shadow-sm">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createMutation.mutate()}
          placeholder="New whiteboard title (e.g. Payments Service Architecture)"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          + New Whiteboard
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {isLoading && <p className="p-6 text-sm text-slate-400">Loading...</p>}
        {!isLoading && whiteboards?.length === 0 && (
          <p className="p-6 text-sm text-slate-400">No whiteboards yet. Create your first one above.</p>
        )}
        <ul className="divide-y divide-slate-100">
          {whiteboards?.map((wb) => (
            <li key={wb.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
              <button onClick={() => navigate(`/whiteboards/${wb.id}`)} className="text-left">
                <p className="font-medium text-slate-800">{wb.title}</p>
                <p className="text-xs text-slate-400">Updated {new Date(wb.updated_at).toLocaleString()}</p>
              </button>
              <button
                onClick={() => deleteMutation.mutate(wb.id)}
                className="text-xs font-semibold text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
