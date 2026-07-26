import { useCallback, useMemo, useRef, useState } from "react";
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nanoid } from "nanoid";
import { toPng } from "html-to-image";
import { findCatalogItem } from "./awsCatalog";
import { CATEGORY_COLORS } from "./categories";
import { BOUNDARY_DEFS, TENANT_COLOR_PALETTE, type BoundaryType } from "./boundaryTypes";
import IconPalette, { DRAG_BOUNDARY_FORMAT, DRAG_DATA_FORMAT } from "./IconPalette";
import { checkConnection } from "./connectionRules";
import ResourceNode from "./nodes/ResourceNode";
import BoundaryNode from "./nodes/BoundaryNode";
import CommentNode from "./nodes/CommentNode";
import type { BoundaryNodeData, CommentNodeData, ResourceNodeData } from "./nodeTypes";
import Inspector from "./Inspector";

const nodeTypes = { resource: ResourceNode, boundary: BoundaryNode, comment: CommentNode };

export interface WhiteboardData {
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
}

function nextTenantColor(nodes: Node[]): string {
  const usedCount = nodes.filter((n) => n.type === "boundary" && (n.data as BoundaryNodeData).boundaryType === "tenant").length;
  return TENANT_COLOR_PALETTE[usedCount % TENANT_COLOR_PALETTE.length];
}

function isDescendantOf(candidateId: string, ancestorId: string, nodes: Node[]): boolean {
  let current = nodes.find((n) => n.id === candidateId);
  const visited = new Set<string>();
  while (current?.parentId) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    if (current.parentId === ancestorId) return true;
    current = nodes.find((n) => n.id === current!.parentId);
  }
  return false;
}

function CanvasInner({
  initialData,
  title,
  onSave,
  saving,
}: {
  initialData: WhiteboardData;
  title: string;
  onSave: (data: WhiteboardData) => void;
  saving: boolean;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialData.edges);
  const [commentMode, setCommentMode] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, getInternalNode, fitView, getViewport } = useReactFlow();

  const selectedNode = useMemo(() => nodes.find((n) => n.selected), [nodes]);

  function flashBanner(message: string) {
    setBanner(message);
    window.setTimeout(() => setBanner((current) => (current === message ? null : current)), 4000);
  }

  const attachToBoundaryIfNeeded = useCallback(
    (nodeId: string, allNodes: Node[]): Node[] => {
      const node = allNodes.find((n) => n.id === nodeId);
      if (!node) return allNodes;

      const internal = getInternalNode(nodeId);
      const abs = internal?.internals.positionAbsolute ?? node.position;
      const width = node.measured?.width ?? node.width ?? 140;
      const height = node.measured?.height ?? node.height ?? 90;
      const centerX = abs.x + width / 2;
      const centerY = abs.y + height / 2;

      let best: Node | undefined;
      let bestArea = Infinity;
      for (const candidate of allNodes) {
        if (candidate.type !== "boundary" || candidate.id === nodeId) continue;
        if (isDescendantOf(candidate.id, nodeId, allNodes)) continue;
        const candInternal = getInternalNode(candidate.id);
        const candAbs = candInternal?.internals.positionAbsolute ?? candidate.position;
        const cw = candidate.measured?.width ?? candidate.width ?? BOUNDARY_DEFS.vpc.defaultWidth;
        const ch = candidate.measured?.height ?? candidate.height ?? BOUNDARY_DEFS.vpc.defaultHeight;
        const within = centerX >= candAbs.x && centerX <= candAbs.x + cw && centerY >= candAbs.y && centerY <= candAbs.y + ch;
        if (within && cw * ch < bestArea) {
          bestArea = cw * ch;
          best = candidate;
        }
      }

      const newParentId = best?.id;
      if (newParentId === node.parentId) return allNodes;

      let newPosition = abs;
      if (best) {
        const parentInternal = getInternalNode(best.id);
        const parentAbs = parentInternal?.internals.positionAbsolute ?? best.position;
        newPosition = { x: abs.x - parentAbs.x, y: abs.y - parentAbs.y };
      }

      const withoutNode = allNodes.filter((n) => n.id !== nodeId);
      const updatedNode: Node = {
        ...node,
        position: newPosition,
        parentId: newParentId,
        extent: newParentId ? ("parent" as const) : undefined,
      };

      if (newParentId) {
        const parentIndex = withoutNode.findIndex((n) => n.id === newParentId);
        const result = [...withoutNode];
        result.splice(parentIndex + 1, 0, updatedNode);
        return result;
      }
      return [...withoutNode, updatedNode];
    },
    [getInternalNode],
  );

  const onNodeDragStop: OnNodeDrag<Node> = useCallback(
    (_event, node) => {
      if (node.type === "comment") return;
      setNodes((nds) => attachToBoundaryIfNeeded(node.id, nds));
    },
    [attachToBoundaryIfNeeded, setNodes],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      const result = checkConnection(sourceNode, targetNode, edges);
      if (!result.allowed) {
        flashBanner(result.reason ?? "This connection is not allowed.");
        return;
      }
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: false,
            style: { stroke: "#64748b", strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
          },
          eds,
        ),
      );
    },
    [nodes, edges, setEdges],
  );

  const isValidConnection = useCallback(
    (connOrEdge: Connection | Edge) => {
      const sourceNode = nodes.find((n) => n.id === connOrEdge.source);
      const targetNode = nodes.find((n) => n.id === connOrEdge.target);
      return checkConnection(sourceNode, targetNode, edges).allowed;
    },
    [nodes, edges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const catalogId = event.dataTransfer.getData(DRAG_DATA_FORMAT);
      const boundaryType = event.dataTransfer.getData(DRAG_BOUNDARY_FORMAT) as BoundaryType | "";
      if (!catalogId && !boundaryType) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      let newNode: Node;
      if (boundaryType) {
        const def = BOUNDARY_DEFS[boundaryType];
        newNode = {
          id: `boundary-${nanoid(8)}`,
          type: "boundary",
          position: { x: position.x - def.defaultWidth / 2, y: position.y - def.defaultHeight / 2 },
          width: def.defaultWidth,
          height: def.defaultHeight,
          zIndex: -1,
          data: {
            boundaryType,
            label: def.label,
            color: boundaryType === "tenant" ? nextTenantColor(nodes) : def.defaultColor,
          } satisfies BoundaryNodeData,
        };
      } else {
        const catalogItem = findCatalogItem(catalogId);
        newNode = {
          id: `res-${nanoid(8)}`,
          type: "resource",
          position: { x: position.x - 70, y: position.y - 45 },
          data: { catalogId, label: catalogItem?.label ?? catalogId } satisfies ResourceNodeData,
        };
      }

      setNodes((nds) => attachToBoundaryIfNeeded(newNode.id, [...nds, newNode]));
    },
    [screenToFlowPosition, setNodes, attachToBoundaryIfNeeded, nodes],
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (!commentMode) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode: Node = {
        id: `comment-${nanoid(8)}`,
        type: "comment",
        position,
        data: { comments: [] } satisfies CommentNodeData,
      };
      setNodes((nds) => [...nds, newNode]);
      setCommentMode(false);
    },
    [commentMode, screenToFlowPosition, setNodes],
  );

  function updateSelectedNodeData(patch: Record<string, unknown>) {
    if (!selectedNode) return;
    setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, ...patch } } : n)));
  }

  function collectDescendantIds(rootId: string, allNodes: Node[]): Set<string> {
    const ids = new Set<string>([rootId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of allNodes) {
        if (n.parentId && ids.has(n.parentId) && !ids.has(n.id)) {
          ids.add(n.id);
          changed = true;
        }
      }
    }
    return ids;
  }

  function deleteSelectedNode() {
    if (!selectedNode) return;
    const toRemove = collectDescendantIds(selectedNode.id, nodes);
    setNodes((nds) => nds.filter((n) => !toRemove.has(n.id)));
    setEdges((eds) => eds.filter((e) => !toRemove.has(e.source) && !toRemove.has(e.target)));
  }

  async function handleExportPng() {
    if (!wrapperRef.current) return;
    const viewportEl = wrapperRef.current.querySelector(".react-flow__viewport") as HTMLElement | null;
    if (!viewportEl) return;
    const dataUrl = await toPng(viewportEl, {
      backgroundColor: "#f8fafc",
      pixelRatio: 2,
    });
    const link = document.createElement("a");
    link.download = `${title || "whiteboard"}.png`;
    link.href = dataUrl;
    link.click();
  }

  function handleSave() {
    onSave({ nodes, edges, viewport: getViewport() });
  }

  const tenantLegend = useMemo(
    () =>
      nodes
        .filter((n) => n.type === "boundary" && (n.data as BoundaryNodeData).boundaryType === "tenant")
        .map((n) => ({ id: n.id, label: (n.data as BoundaryNodeData).label, color: (n.data as BoundaryNodeData).color })),
    [nodes],
  );

  return (
    <div className="flex h-full w-full">
      <IconPalette />
      <div className="relative flex-1" ref={wrapperRef}>
        <div className="absolute left-3 top-3 z-10 flex gap-2">
          <button
            onClick={() => setCommentMode((v) => !v)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm ${
              commentMode ? "bg-amber-500 text-white" : "bg-white text-slate-700"
            }`}
          >
            💬 {commentMode ? "Click canvas to place..." : "Add Comment"}
          </button>
          <button
            onClick={() => setShowLegend((v) => !v)}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
          >
            Legend
          </button>
          <button
            onClick={handleExportPng}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
          >
            Export PNG
          </button>
        </div>

        <div className="absolute right-3 top-3 z-10">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        {banner && (
          <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white shadow-lg">
            {banner}
          </div>
        )}

        {showLegend && tenantLegend.length > 0 && (
          <div className="absolute bottom-4 left-3 z-10 rounded-lg bg-white/95 p-3 text-xs shadow-md">
            <p className="mb-1 font-semibold text-slate-600">Tenants</p>
            {tenantLegend.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-slate-600">{t.label}</span>
              </div>
            ))}
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeDragStop={onNodeDragStop}
          onPaneClick={onPaneClick}
          defaultViewport={initialData.viewport}
          minZoom={0.15}
          maxZoom={2.5}
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls />
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) =>
              n.type === "resource"
                ? CATEGORY_COLORS[findCatalogItem((n.data as ResourceNodeData).catalogId)?.category ?? "management"]
                : "#cbd5e1"
            }
          />
        </ReactFlow>
      </div>
      {selectedNode && (
        <Inspector node={selectedNode} onChange={updateSelectedNodeData} onDelete={deleteSelectedNode} onFitView={() => fitView()} />
      )}
    </div>
  );
}

export default function WhiteboardCanvas(props: {
  initialData: WhiteboardData;
  title: string;
  onSave: (data: WhiteboardData) => void;
  saving: boolean;
}) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
