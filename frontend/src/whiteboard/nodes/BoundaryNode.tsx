import { memo } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { BOUNDARY_DEFS } from "../boundaryTypes";
import type { BoundaryNodeData } from "../nodeTypes";

function BoundaryNode({ data, selected }: NodeProps) {
  const nodeData = data as BoundaryNodeData;
  const def = BOUNDARY_DEFS[nodeData.boundaryType];
  const color = nodeData.color || def.defaultColor;

  return (
    <div
      className="h-full w-full rounded-xl"
      style={{
        border: `2px ${nodeData.boundaryType === "subnet" ? "solid" : "dashed"} ${color}`,
        backgroundColor: `${color}0d`,
      }}
    >
      <NodeResizer
        color={color}
        isVisible={selected}
        minWidth={180}
        minHeight={140}
        handleStyle={{ width: 8, height: 8 }}
      />
      <div
        className="pointer-events-none absolute -top-3 left-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
        style={{ backgroundColor: color }}
      >
        {def.label}
      </div>
      <div
        className="pointer-events-none absolute left-3 top-4 max-w-[80%] truncate text-xs font-semibold"
        style={{ color }}
      >
        {nodeData.label}
      </div>
    </div>
  );
}

export default memo(BoundaryNode);
