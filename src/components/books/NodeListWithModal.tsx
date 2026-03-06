"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MindMapNode } from "@/components/map/MindMap";
import type { NodeDetailModalEdge } from "@/components/map/NodeDetailModal";
import { NodeDetailModal } from "@/components/map/NodeDetailModal";
import { deleteEdge, deleteNode } from "@/app/books/actions";

type NodeListWithModalProps = {
  nodes: MindMapNode[];
  edges: NodeDetailModalEdge[];
};

export function NodeListWithModal({ nodes, edges }: NodeListWithModalProps) {
  const router = useRouter();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode =
    selectedNodeId != null
      ? nodes.find((n) => n.id === selectedNodeId) ?? null
      : null;

  const handleDeleteEdge = (edgeId: string) => {
    deleteEdge(edgeId)
      .then(() => {
        router.refresh();
      })
      .catch((err) => {
        console.error("[NodeListWithModal] エッジ削除エラー:", err);
      });
  };

  const handleDeleteNode = async (nodeId: string): Promise<boolean> => {
    const result = await deleteNode(nodeId);
    if (result && "error" in result) {
      console.error("[NodeListWithModal] ノード削除エラー:", result.error);
      return false;
    }
    router.refresh();
    setSelectedNodeId(null);
    return true;
  };

  if (!nodes.length) {
    return <p className="text-stone-500 text-sm">まだノードがありません。</p>;
  }

  return (
    <>
      <ul className="space-y-3">
        {nodes.map((node) => (
          <li key={node.id}>
            <button
              type="button"
              onClick={() => setSelectedNodeId(node.id)}
              className="w-full text-left p-4 rounded-2xl border border-stone-200 bg-section hover:border-primary/30 hover:bg-white transition-colors"
            >
              <p className="text-stone-800 whitespace-pre-wrap line-clamp-3">
                {node.content}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <NodeDetailModal
        isOpen={selectedNodeId !== null}
        onClose={() => setSelectedNodeId(null)}
        node={selectedNode}
        edges={edges}
        nodes={nodes}
        onDeleteEdge={handleDeleteEdge}
        onDeleteNode={handleDeleteNode}
      />
    </>
  );
}
