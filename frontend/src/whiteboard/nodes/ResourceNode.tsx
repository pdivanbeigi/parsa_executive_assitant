import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CATEGORY_COLORS } from "../categories";
import { findCatalogItem } from "../awsCatalog";
import type { ResourceNodeData } from "../nodeTypes";

function ResourceNode({ data, selected }: NodeProps) {
  const nodeData = data as ResourceNodeData;
  const catalogItem = findCatalogItem(nodeData.catalogId);
  const color = catalogItem ? CATEGORY_COLORS[catalogItem.category] : "#64748b";

  return (
    <div
      className={`group flex w-[140px] flex-col items-center gap-1 rounded-xl border-2 bg-white px-2 py-2 shadow-sm transition ${
        selected ? "border-brand-500 shadow-md" : "border-transparent"
      }`}
      style={{ boxShadow: selected ? undefined : "0 1px 2px rgba(15,23,42,0.08)" }}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-slate-400 !bg-white" />
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-slate-400 !bg-white" />
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-slate-400 !bg-white" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-slate-400 !bg-white" />

      <div
        className="flex h-11 w-11 items-center justify-center rounded-lg text-[11px] font-bold text-white"
        style={{ backgroundColor: color }}
        title={catalogItem?.tags.join(", ")}
      >
        {catalogItem?.shortCode ?? "?"}
      </div>
      <p className="max-w-[130px] truncate text-center text-[11px] font-medium leading-tight text-slate-700">
        {nodeData.label}
      </p>
    </div>
  );
}

export default memo(ResourceNode);
