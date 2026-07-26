import { memo, useState } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import type { CommentNodeData } from "../nodeTypes";

function CommentNode({ id, data, selected }: NodeProps) {
  const nodeData = data as CommentNodeData;
  const { setNodes } = useReactFlow();
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(selected);

  function addComment() {
    if (!draft.trim()) return;
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                comments: [...(nodeData.comments ?? []), { text: draft.trim(), createdAt: new Date().toISOString() }],
              },
            }
          : n,
      ),
    );
    setDraft("");
  }

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-300 text-sm shadow-md"
        title="Comment"
      >
        💬
      </button>
      {nodeData.comments?.length > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[9px] font-bold text-white">
          {nodeData.comments.length}
        </span>
      )}

      {open && (
        <div className="absolute left-10 top-0 z-20 w-64 rounded-xl border border-amber-200 bg-white p-3 shadow-xl">
          <p className="mb-2 text-xs font-semibold text-slate-600">Comments</p>
          <div className="mb-2 max-h-40 space-y-2 overflow-y-auto">
            {(nodeData.comments ?? []).length === 0 && (
              <p className="text-xs text-slate-400">No comments yet.</p>
            )}
            {(nodeData.comments ?? []).map((c, i) => (
              <div key={i} className="rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                <p>{c.text}</p>
                <p className="mt-1 text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addComment()}
              placeholder="Add a comment..."
              className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
            />
            <button
              onClick={addComment}
              className="rounded-md bg-amber-500 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-600"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(CommentNode);
