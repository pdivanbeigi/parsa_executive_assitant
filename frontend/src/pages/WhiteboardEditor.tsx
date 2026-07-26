import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { whiteboardsApi } from "../api/whiteboards";
import WhiteboardCanvas, { type WhiteboardData } from "../whiteboard/WhiteboardCanvas";

export default function WhiteboardEditor() {
  const { whiteboardId } = useParams();
  const id = Number(whiteboardId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");

  const { data: whiteboard, isLoading } = useQuery({
    queryKey: ["whiteboard", id],
    queryFn: () => whiteboardsApi.get(id),
    enabled: !Number.isNaN(id),
  });

  useEffect(() => {
    if (whiteboard) setTitle(whiteboard.title);
  }, [whiteboard]);

  const saveMutation = useMutation({
    mutationFn: (data: WhiteboardData) => whiteboardsApi.update(id, title, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whiteboards"] }),
  });

  if (Number.isNaN(id)) return <p className="p-8 text-red-600">Invalid whiteboard id</p>;
  if (isLoading || !whiteboard) return <p className="p-8 text-slate-400">Loading whiteboard...</p>;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/whiteboards")} className="text-sm text-slate-500 hover:text-slate-700">
            ← Back
          </button>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-b border-transparent px-1 text-sm font-semibold text-slate-800 focus:border-slate-300 focus:outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <WhiteboardCanvas
          initialData={whiteboard.data as WhiteboardData}
          title={title}
          saving={saveMutation.isPending}
          onSave={(data) => saveMutation.mutate(data)}
        />
      </div>
    </div>
  );
}
