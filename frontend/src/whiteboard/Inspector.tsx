import type { Node } from "@xyflow/react";
import { findCatalogItem } from "./awsCatalog";
import { CATEGORY_LABELS } from "./categories";
import { BOUNDARY_DEFS, TENANT_COLOR_PALETTE } from "./boundaryTypes";
import type { BoundaryNodeData, ResourceNodeData } from "./nodeTypes";

export default function Inspector({
  node,
  onChange,
  onDelete,
  onFitView,
}: {
  node: Node;
  onChange: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
  onFitView: () => void;
}) {
  return (
    <div className="w-64 shrink-0 border-l border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Properties</h3>
        <button onClick={onFitView} className="text-xs text-slate-400 hover:text-slate-600">
          Fit view
        </button>
      </div>

      {node.type === "resource" && <ResourceInspector node={node} onChange={onChange} />}
      {node.type === "boundary" && <BoundaryInspector node={node} onChange={onChange} />}
      {node.type === "comment" && <p className="text-xs text-slate-400">Use the comment bubble to manage notes.</p>}

      <button
        onClick={onDelete}
        className="mt-6 w-full rounded-lg border border-red-200 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  );
}

function ResourceInspector({ node, onChange }: { node: Node; onChange: (patch: Record<string, unknown>) => void }) {
  const data = node.data as ResourceNodeData;
  const catalogItem = findCatalogItem(data.catalogId);
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Label</label>
        <input
          value={data.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      {catalogItem && (
        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <p>
            <span className="font-semibold text-slate-600">Type:</span> {catalogItem.label}
          </p>
          <p>
            <span className="font-semibold text-slate-600">Category:</span> {CATEGORY_LABELS[catalogItem.category]}
          </p>
          <p className="mt-1">
            <span className="font-semibold text-slate-600">Tags:</span> {catalogItem.tags.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

function BoundaryInspector({ node, onChange }: { node: Node; onChange: (patch: Record<string, unknown>) => void }) {
  const data = node.data as BoundaryNodeData;
  const def = BOUNDARY_DEFS[data.boundaryType];
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Label</label>
        <input
          value={data.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <p className="text-xs text-slate-400">{def.description}</p>
      {data.boundaryType === "tenant" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Color</label>
          <div className="flex flex-wrap gap-2">
            {TENANT_COLOR_PALETTE.map((color) => (
              <button
                key={color}
                onClick={() => onChange({ color })}
                className="h-6 w-6 rounded-full border-2"
                style={{ backgroundColor: color, borderColor: data.color === color ? "#0f172a" : "transparent" }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
