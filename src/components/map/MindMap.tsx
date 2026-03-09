"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Controls,
  Background,
  Panel,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
} from "reactflow";
import "reactflow/dist/style.css";
import { updateNodePosition, createEdge, deleteEdge, deleteNode } from "@/app/contents/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BookRootNode } from "./BookRootNode";
import { AbstractNode } from "./AbstractNode";
import { DetailNode } from "./DetailNode";
import { NodeDetailModal } from "./NodeDetailModal";
import { FloatingStraightEdge } from "./FloatingStraightEdge";
import { getLayoutedElements, getFullLayoutElements } from "./mindMapLayout";

export type MindMapNode = {
  id: string;
  type: "book_root" | "quote" | "thought";
  layer: number;
  content: string;
  interpretation: string | null;
  position_x: number;
  position_y: number;
  /** グローバルビューで「このコンテンツへ」リンク用。省略時は同一コンテンツページ想定 */
  content_id?: string | null;
};

export type MindMapEdge = {
  id: string;
  source_node_id: string;
  target_node_id: string;
};

const NODE_TYPES = {
  bookRoot: BookRootNode,
  abstract: AbstractNode,
  detail: DetailNode,
};

const GRID_STEP_X = 260;
const GRID_STEP_Y = 160;
const ROOT_POSITION = { x: 350, y: 80 };
/** 本ノード（Layer 0）の初期配置で、既存ノードとの最小間隔（px） */
const ROOT_SPACING = 500;
/** 本ノードの推定サイズ（境界計算・重なり防止用） */
const ROOT_NODE_WIDTH = 220;
const ROOT_NODE_HEIGHT = 60;

function getNodeType(layer: number): "bookRoot" | "abstract" | "detail" {
  if (layer === 0) return "bookRoot";
  if (layer === 1) return "abstract";
  return "detail";
}

/** 座標が保存済みのノードから境界ボックスを計算（推定サイズ使用） */
function getBoundingBox(nodes: MindMapNode[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasAny = false;
  for (const n of nodes) {
    if (n.position_x === 0 && n.position_y === 0) continue;
    hasAny = true;
    const w = n.layer === 0 ? ROOT_NODE_WIDTH : 240;
    const h = n.layer === 0 ? ROOT_NODE_HEIGHT : 90;
    minX = Math.min(minX, n.position_x);
    minY = Math.min(minY, n.position_y);
    maxX = Math.max(maxX, n.position_x + w);
    maxY = Math.max(maxY, n.position_y + h);
  }
  if (!hasAny) return null;
  return { minX, minY, maxX, maxY };
}

function buildRfNodes(nodes: MindMapNode[]): Node[] {
  const needsDefault = nodes.map((n, i) => ({
    index: i,
    useDefault: n.position_x === 0 && n.position_y === 0,
  }));

  const bbox = getBoundingBox(nodes);
  const defaultRootIndices = nodes
    .map((n, i) => (needsDefault[i]?.useDefault && n.layer === 0 ? i : -1))
    .filter((i) => i >= 0);

  let rootPlaceX = ROOT_POSITION.x;
  let rootPlaceY = ROOT_POSITION.y;
  if (bbox && defaultRootIndices.length > 0) {
    rootPlaceX = bbox.maxX + ROOT_SPACING;
    rootPlaceY = bbox.minY;
  }
  let nextRootIndex = 0;

  let gridIndex = 0;

  return nodes.map((n, i) => {
    const useDefault = needsDefault[i]?.useDefault ?? false;
    let x: number;
    let y: number;
    if (useDefault) {
      if (n.layer === 0) {
        x = rootPlaceX + nextRootIndex * ROOT_SPACING;
        y = rootPlaceY;
        nextRootIndex += 1;
      } else {
        const col = gridIndex % 4;
        const row = Math.floor(gridIndex / 4);
        x = 80 + col * GRID_STEP_X;
        y = 320 + row * GRID_STEP_Y;
        gridIndex += 1;
      }
    } else {
      x = n.position_x;
      y = n.position_y;
    }
    return {
      id: n.id,
      type: getNodeType(n.layer),
      position: { x, y },
      data: {
        content: n.content,
        interpretation: n.interpretation ?? null,
        layer: n.layer,
        kind: n.type,
        content_id: n.content_id ?? null,
      },
    };
  });
}

// stone-300 の落ち着いたグレー、太さ 1.5
const EDGE_STYLE = { stroke: "#d6d3d1", strokeWidth: 1.5 };
// 本を跨ぐエッジ：鮮やかなブルーで強調
const CROSS_BOOK_EDGE_STYLE = { stroke: "#3b82f6", strokeWidth: 2 };

const EDGE_TYPES = {
  floatingStraight: FloatingStraightEdge,
};

function buildRfEdges(edges: MindMapEdge[], nodes: MindMapNode[]): Edge[] {
  const contentIdByNodeId = new Map<string, string | null>();
  for (const n of nodes) {
    contentIdByNodeId.set(n.id, n.content_id ?? null);
  }
  return edges.map((e) => {
    const sourceContent = contentIdByNodeId.get(e.source_node_id) ?? null;
    const targetContent = contentIdByNodeId.get(e.target_node_id) ?? null;
    const isCrossBook =
      sourceContent != null && targetContent != null && sourceContent !== targetContent;
    return {
      id: e.id,
      source: e.source_node_id,
      target: e.target_node_id,
      type: "floatingStraight",
      style: isCrossBook ? CROSS_BOOK_EDGE_STYLE : EDGE_STYLE,
    };
  });
}

const FIT_VIEW_DURATION = 300;

/** Provider 内で fitView を ref に渡し、親の effect から呼べるようにする */
function FitViewRefBridge({
  fitViewRef,
}: {
  fitViewRef: React.MutableRefObject<((opts?: { padding?: number; duration?: number }) => void) | null>;
}) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    fitViewRef.current = (opts) =>
      fitView({ padding: opts?.padding ?? 0.2, duration: opts?.duration ?? FIT_VIEW_DURATION });
    return () => {
      fitViewRef.current = null;
    };
  }, [fitView, fitViewRef]);
  return null;
}

/**
 * コンテンツ詳細ページ (/contents/[id]) 専用オートフォーカス。
 * ルート＋エッセンス（Layer 1）を nodes に指定し、そのバウンディングボックスで fitView する。
 */
function FocusContentBridge({ focusContentId }: { focusContentId: string | undefined }) {
  const { getNodes, fitView } = useReactFlow();
  const hasFocusedRef = useRef(false);

  useEffect(() => {
    if (!focusContentId || hasFocusedRef.current) return;

    const runFocus = () => {
      const nodes = getNodes();
      const contentNodes = nodes.filter(
        (n) =>
          (n.data?.content_id as string) === focusContentId &&
          ((n.data?.layer as number) === 0 ||
            (n.data?.layer as number) === 1 ||
            n.type === "bookRoot" ||
            n.type === "abstract")
      );
      if (contentNodes.length === 0) return;
      hasFocusedRef.current = true;
      const nodeIds = contentNodes.map((n) => ({ id: n.id }));
      fitView({
        nodes: nodeIds,
        padding: 0.25,
        maxZoom: 2.0,
        duration: 400,
      });
    };

    const t = setTimeout(runFocus, 150);
    return () => clearTimeout(t);
  }, [focusContentId, getNodes, fitView]);
  return null;
}

type LayoutPanelProps = {
  rfNodes: Node[];
  rfEdges: Edge[];
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  onPersistPositions: (nodes: Node[]) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
};

function LayoutPanel({
  rfNodes,
  rfEdges,
  setNodes,
  onPersistPositions,
  isFullscreen,
  onToggleFullscreen,
}: LayoutPanelProps) {
  const { fitView } = useReactFlow();

  const handleFullLayout = useCallback(() => {
    const layouted = getFullLayoutElements(rfNodes, rfEdges);
    setNodes(layouted);
    onPersistPositions(layouted);
    requestAnimationFrame(() => {
      fitView({ padding: 0.2, duration: FIT_VIEW_DURATION });
    });
  }, [rfNodes, rfEdges, setNodes, onPersistPositions, fitView]);

  const handleNudgeLayout = useCallback(() => {
    const layouted = getLayoutedElements(rfNodes, rfEdges);
    setNodes(layouted);
    onPersistPositions(layouted);
  }, [rfNodes, rfEdges, setNodes, onPersistPositions]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleFullLayout}
        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50"
        title="位置をリセットして、全体を階層に沿って一から綺麗に並べ直します"
      >
        <span aria-hidden>⊞</span>
        全体を再配置
      </button>
      <button
        type="button"
        onClick={handleNudgeLayout}
        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50"
        title="今の配置はそのままで、重なっている部分だけ最小限の動きで解消します"
      >
        <span aria-hidden>◎</span>
        位置を微調整
      </button>
      <button
        type="button"
        onClick={onToggleFullscreen}
        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50"
        title={isFullscreen ? "フルスクリーンを終了" : "フルスクリーンで表示"}
      >
        {isFullscreen ? "終了" : "フルスクリーンで表示"}
      </button>
    </div>
  );
}

type MindMapProps = {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  /** 指定時はそのコンテンツのルートを画面中央に表示（個別ページで全体マップ表示時用） */
  focusContentId?: string;
  className?: string;
};

export function MindMap({ nodes, edges, focusContentId, className = "" }: MindMapProps) {
  const initialNodes = useMemo(() => buildRfNodes(nodes), [nodes]);
  const initialEdges = useMemo(() => buildRfEdges(edges, nodes), [edges, nodes]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(initialNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [edgeToDeleteId, setEdgeToDeleteId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevNodeCountRef = useRef(nodes.length);
  const fitViewRef = useRef<((opts?: { padding?: number; duration?: number }) => void) | null>(null);
  /** ユーザーが手動でドラッグした場合のみ true。プログラム的な位置変更では保存しない */
  const userDraggingRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const onFullscreenChange = () =>
      setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  const handleDeleteNode = useCallback(
    async (nodeId: string): Promise<boolean> => {
      const result = await deleteNode(nodeId);
      if (result && "error" in result) {
        console.error("[MindMap] ノード削除エラー:", result.error);
        return false;
      }
      router.refresh();
      setSelectedNodeId(null);
      return true;
    },
    [router]
  );

  const persistPositions = useCallback((layoutedNodes: Node[]) => {
    layoutedNodes.forEach((n) => {
      updateNodePosition(n.id, n.position.x, n.position.y).catch((err) => {
        console.error("[MindMap] 位置保存エラー:", err);
      });
    });
  }, []);

  // 新しいノード追加時に「位置を微調整」のみ実行し、重なりを解消。fitView で追加ノードが視覚的に追えるようにする
  useEffect(() => {
    if (nodes.length === 0 || nodes.length <= prevNodeCountRef.current) {
      prevNodeCountRef.current = nodes.length;
      return;
    }
    prevNodeCountRef.current = nodes.length;
    const current = buildRfNodes(nodes);
    const edgeList = buildRfEdges(edges, nodes);
    const layouted = getLayoutedElements(current, edgeList);
    setRfNodes(layouted);
    persistPositions(layouted);
    requestAnimationFrame(() => {
      fitViewRef.current?.({ padding: 0.2, duration: FIT_VIEW_DURATION });
    });
  }, [nodes, edges, setRfNodes, persistPositions]);

  // モーダルで編集したときなど、サーバーから渡る nodes の content/interpretation を React Flow の data に同期する（位置は維持）
  useEffect(() => {
    if (nodes.length === 0) return;
    setRfNodes((current) =>
      current.map((rfNode) => {
        const fromServer = nodes.find((n) => n.id === rfNode.id);
        if (!fromServer) return rfNode;
        return {
          ...rfNode,
          data: {
            content: fromServer.content,
            interpretation: fromServer.interpretation ?? null,
            layer: fromServer.layer,
            kind: fromServer.type,
            content_id: fromServer.content_id ?? (rfNode.data?.content_id as string | null) ?? null,
          },
        };
      })
    );
  }, [nodes, setRfNodes]);

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      setRfEdges((eds) => eds.filter((e) => e.id !== edgeId));
      deleteEdge(edgeId).catch((err) => {
        console.error("[MindMap] エッジ削除エラー:", err);
      });
    },
    [setRfEdges]
  );

  const onEdgeDoubleClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setEdgeToDeleteId(edge.id);
  }, []);

  const confirmDeleteEdge = useCallback(() => {
    if (edgeToDeleteId) {
      handleDeleteEdge(edgeToDeleteId);
      setEdgeToDeleteId(null);
    }
  }, [edgeToDeleteId, handleDeleteEdge]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setFocusedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setFocusedNodeId(null);
  }, []);

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [nodes, selectedNodeId]
  );

  const onNodeDragStart = useCallback(() => {
    userDraggingRef.current = true;
  }, []);

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (!userDraggingRef.current) return;
      userDraggingRef.current = false;
      updateNodePosition(node.id, node.position.x, node.position.y).catch((err) => {
        console.error("[MindMap] 位置保存エラー:", err);
      });
    },
    []
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      setRfEdges((eds) => addEdge(params, eds));
      createEdge(params.source, params.target).catch((err) => {
        console.error("[MindMap] エッジ作成エラー:", err);
      });
    },
    [setRfEdges]
  );

  const highlightedNodeIds = useMemo(() => {
    if (!focusedNodeId) return null;
    const focused = rfNodes.find((n) => n.id === focusedNodeId);
    const layer = (focused?.data?.layer as number) ?? 2;

    const set = new Set<string>([focusedNodeId]);

    if (layer === 2) {
      const parentId = rfEdges.find((e) => e.target === focusedNodeId)?.source ?? null;
      const rootNode = rfNodes.find((n) => (n.data?.layer as number) === 0);
      const rootId = rootNode?.id ?? null;

      if (parentId) set.add(parentId);
      if (rootId) set.add(rootId);

      rfNodes.forEach((n) => {
        const nLayer = n.data?.layer as number;
        if (nLayer !== 2 || n.id === focusedNodeId) return;
        const hasEdgeFromParent = rfEdges.some((e) => e.source === parentId && e.target === n.id);
        if (hasEdgeFromParent) set.add(n.id);
      });
    } else {
      rfEdges.forEach((e) => {
        if (e.source === focusedNodeId || e.target === focusedNodeId) {
          set.add(e.source);
          set.add(e.target);
        }
      });
    }
    return set;
  }, [focusedNodeId, rfNodes, rfEdges]);

  const highlightedEdgeIds = useMemo(() => {
    if (!highlightedNodeIds) return null;
    return new Set(
      rfEdges
        .filter(
          (e) => highlightedNodeIds.has(e.source) && highlightedNodeIds.has(e.target)
        )
        .map((e) => e.id)
    );
  }, [focusedNodeId, highlightedNodeIds, rfEdges]);

  const nodesWithFocus = useMemo(() => {
    if (!highlightedNodeIds) return rfNodes;
    return rfNodes.map((n) => ({
      ...n,
      style: {
        ...n.style,
        opacity: highlightedNodeIds.has(n.id) ? 1 : 0.2,
        transition: "opacity 300ms ease",
      },
    }));
  }, [rfNodes, highlightedNodeIds]);

  const edgesWithFocus = useMemo(() => {
    if (!highlightedEdgeIds) return rfEdges;
    return rfEdges.map((e) => ({
      ...e,
      style: {
        ...e.style,
        opacity: highlightedEdgeIds.has(e.id) ? 1 : 0.2,
        transition: "opacity 300ms ease",
      },
    }));
  }, [rfEdges, highlightedEdgeIds]);

  if (nodes.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-stone-200 bg-section ${className}`}
        style={{ minHeight: 600 }}
      >
        <p className="text-stone-500">ノードがありません。ノードを追加するとマインドマップに表示されます。</p>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div
        ref={containerRef}
        className={`mindmap-fullscreen-container ${className}`.trim()}
        style={{
          height: isFullscreen ? "100vh" : 640,
          minHeight: 640,
          width: isFullscreen ? "100vw" : undefined,
        }}
      >
        <ReactFlow
        nodes={nodesWithFocus}
        edges={edgesWithFocus}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onConnect={onConnect}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        defaultEdgeOptions={{ type: "floatingStraight", style: EDGE_STYLE }}
        fitView={focusContentId == null}
        fitViewOptions={{ padding: 0.2, duration: FIT_VIEW_DURATION }}
        minZoom={0.2}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
        proOptions={{ hideAttribution: true }}
      >
        <FitViewRefBridge fitViewRef={fitViewRef} />
        {focusContentId != null && <FocusContentBridge focusContentId={focusContentId} />}
        <Controls />
        <Background gap={16} size={1} color="#a8a29e" />
        <Panel position="top-right">
          <LayoutPanel
            rfNodes={rfNodes}
            rfEdges={rfEdges}
            setNodes={setRfNodes}
            onPersistPositions={persistPositions}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        </Panel>
      </ReactFlow>

        <NodeDetailModal
          isOpen={selectedNodeId !== null}
          onClose={() => setSelectedNodeId(null)}
          node={selectedNode}
          edges={rfEdges}
          nodes={nodes}
          onDeleteEdge={handleDeleteEdge}
          onDeleteNode={handleDeleteNode}
        />

        <AlertDialog open={edgeToDeleteId !== null} onOpenChange={(open) => !open && setEdgeToDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>接続を削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                この接続を削除すると、ノード間の線が取り除かれます。ノード自体は残ります。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteEdge}>削除する</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ReactFlowProvider>
  );
}
