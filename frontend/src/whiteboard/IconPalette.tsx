import { useMemo, useState } from "react";
import { AWS_CATALOG, searchCatalog } from "./awsCatalog";
import { CATEGORY_COLORS, CATEGORY_LABELS, type Category } from "./categories";
import { BOUNDARY_DEFS, type BoundaryType } from "./boundaryTypes";

export const DRAG_DATA_FORMAT = "application/x-whiteboard-catalog-id";
export const DRAG_BOUNDARY_FORMAT = "application/x-whiteboard-boundary-type";

export default function IconPalette() {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const results = searchCatalog(query);
    const byCategory = new Map<Category, typeof results>();
    for (const item of results) {
      const list = byCategory.get(item.category) ?? [];
      list.push(item);
      byCategory.set(item.category, list);
    }
    return byCategory;
  }, [query]);

  return (
    <div className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search resources (e.g. python, mysql)..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="border-b border-slate-100 p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Boundaries</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(BOUNDARY_DEFS) as BoundaryType[]).map((type) => {
            const def = BOUNDARY_DEFS[type];
            return (
              <div
                key={type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(DRAG_BOUNDARY_FORMAT, type);
                  e.dataTransfer.effectAllowed = "move";
                }}
                className="cursor-grab select-none rounded-lg border-2 border-dashed px-2 py-2 text-center text-[11px] font-medium active:cursor-grabbing"
                style={{ borderColor: def.defaultColor, color: def.defaultColor }}
              >
                {def.label}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {AWS_CATALOG.length > 0 && grouped.size === 0 && (
          <p className="p-4 text-center text-sm text-slate-400">No matching resources.</p>
        )}
        {[...grouped.entries()].map(([category, items]) => (
          <div key={category} className="mb-4">
            <p
              className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: CATEGORY_COLORS[category] }}
            >
              {CATEGORY_LABELS[category]}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DRAG_DATA_FORMAT, item.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  title={item.tags.join(", ")}
                  className="flex cursor-grab select-none flex-col items-center gap-1 rounded-lg border border-slate-200 p-2 text-center transition hover:border-slate-300 hover:shadow-sm active:cursor-grabbing"
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-md text-[10px] font-bold text-white"
                    style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
                  >
                    {item.shortCode}
                  </div>
                  <span className="text-[10px] leading-tight text-slate-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
