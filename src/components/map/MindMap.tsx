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
import { updateNodePosition, createEdge, deleteEdge, deleteNode } from "@/app/books/actions";
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

function getNodeType(layer: number): "bookRoot" | "abstract" | "detail" {
  if (layer === 0) return "bookRoot";
  if (layer === 1) return "abstract";
  return "detail";
}

function buildRfNodes(nodes: MindMapNode[]): Node[] {
  const needsDefault = nodes.map((n, i) => ({
    index: i,
    useDefault: n.position_x === 0 && n.position_y === 0,
  }));
  let gridIndex = 0;

  return nodes.map((n, i) => {
    const useDefault = needsDefault[i]?.useDefault ?? false;
    let x: number;
    let y: number;
    if (useDefault) {
      if (n.layer === 0) {
        x = ROOT_POSITION.x;
        y = ROOT_POSITION.y;
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
      },
    };
  });
}

// stone-300 の落ち着いたグレー、太さ 1.5
const EDGE_STYLE = { stroke: "#d6d3d1", strokeWidth: 1.5 };

const EDGE_TYPES = {
  floatingStraight: FloatingStraightEdge,
};

function buildRfEdges(edges: MindMapEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source_node_id,
    target: e.target_node_id,
    type: "floatingStraight",
    style: EDGE_STYLE,
  }));
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
  className?: string;
};

export function MindMap({ nodes, edges, className = "" }: MindMapProps) {
  const initialNodes = useMemo(() => buildRfNodes(nodes), [nodes]);
  const initialEdges = useMemo(() => buildRfEdges(edges), [edges]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(initialNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [edgeToDeleteId, setEdgeToDeleteId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevNodeCountRef = useRef(nodes.length);
  const fitViewRef = useRef<((opts?: { padding?: number; duration?: number }) => void) | null>(null);
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
    const edgeList = buildRfEdges(edges);
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
    setSelectedNodeId(node.id);
  }, []);

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [nodes, selectedNodeId]
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
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
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onConnect={onConnect}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        defaultEdgeOptions={{ type: "floatingStraight", style: EDGE_STYLE }}
        fitView
        fitViewOptions={{ padding: 0.2, duration: FIT_VIEW_DURATION }}
        minZoom={0.2}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
        proOptions={{ hideAttribution: true }}
      >
        <FitViewRefBridge fitViewRef={fitViewRef} />
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
