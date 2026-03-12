"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MindMapNode } from "@/components/map/MindMap";
import type { NodeDetailModalEdge } from "@/components/map/NodeDetailModal";
import { NodeDetailModal } from "@/components/map/NodeDetailModal";
import { deleteEdge, deleteNode } from "@/app/contents/actions";
import { stripHtml } from "@/lib/html";

type NodeListWithModalProps = {
  nodes: MindMapNode[];
  edges: NodeDetailModalEdge[];
};

function buildHierarchy(
  nodes: MindMapNode[],
  edges: NodeDetailModalEdge[]
): { type: "essence-block"; essence: MindMapNode; children: MindMapNode[] }[] {
  const parentMap = new Map<string, string>();
  for (const e of edges) parentMap.set(e.target, e.source);
  const nodeOrder = new Map(nodes.map((n, i) => [n.id, i]));

  const essences = nodes.filter((n) => n.layer === 1).sort((a, b) => (nodeOrder.get(a.id) ?? 0) - (nodeOrder.get(b.id) ?? 0));
  const blocks: { type: "essence-block"; essence: MindMapNode; children: MindMapNode[] }[] = [];

  for (const essence of essences) {
    const children = nodes
      .filter((n) => n.layer === 2 && parentMap.get(n.id) === essence.id)
      .sort((a, b) => (nodeOrder.get(a.id) ?? 0) - (nodeOrder.get(b.id) ?? 0));
    blocks.push({ type: "essence-block", essence, children });
  }
  return blocks;
}

function getRootNotes(
  nodes: MindMapNode[],
  edges: NodeDetailModalEdge[]
): MindMapNode[] {
  const root = nodes.find((n) => n.layer === 0);
  const rootId = root?.id ?? null;
  const parentMap = new Map<string, string>();
  for (const e of edges) parentMap.set(e.target, e.source);
  const nodeOrder = new Map(nodes.map((n, i) => [n.id, i]));

  return nodes
    .filter((n) => {
      if (n.layer !== 2) return false;
      const parent = parentMap.get(n.id);
      return parent === rootId || parent == null;
    })
    .sort((a, b) => (nodeOrder.get(a.id) ?? 0) - (nodeOrder.get(b.id) ?? 0));
}

export function NodeListWithModal({ nodes, edges }: NodeListWithModalProps) {
  const router = useRouter();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const hierarchy = useMemo(() => buildHierarchy(nodes, edges), [nodes, edges]);
  const rootNotes = useMemo(() => getRootNotes(nodes, edges), [nodes, edges]);

  const selectedNode = selectedNodeId != null ? nodes.find((n) => n.id === selectedNodeId) ?? null : null;

  const handleDeleteEdge = (edgeId: string) => {
    deleteEdge(edgeId).then(() => router.refresh()).catch((err) => console.error("[NodeListWithModal] エッジ削除エラー:", err));
  };

  const handleDeleteNode = async (nodeId: string): Promise<boolean> => {
    const result = await deleteNode(nodeId);
    if (result && "error" in result) return false;
    router.refresh();
    setSelectedNodeId(null);
    return true;
  };

  const openNode = (id: string) => () => setSelectedNodeId(id);

  if (!nodes.length) return <p className="text-stone-500 text-sm">まだノードがありません。</p>;

  return (
    <>
      <div className="space-y-6">
        {hierarchy.map((block) => (
          <div key={block.essence.id} className="rounded-xl border border-stone-200 bg-white overflow-hidden">
            <button type="button" onClick={openNode(block.essence.id)} className="w-full text-left p-4 pl-5 border-l-4 border-primary bg-section/50 hover:bg-section transition-colors">
              <p className="font-bold text-stone-900 whitespace-pre-wrap">{stripHtml(block.essence.content)}</p>
              <div className="mt-2 h-px bg-stone-200" aria-hidden />
            </button>
            {block.children.length > 0 && (
              <div className="border-t border-stone-100">
                {block.children.map((child) => (
                  <div key={child.id} className="relative flex">
                    <div className="absolute left-8 top-0 bottom-0 w-px bg-stone-200" aria-hidden />
                    <div className="absolute left-8 top-4 h-px w-4 bg-stone-200" aria-hidden />
                    <button type="button" onClick={openNode(child.id)} className="ml-8 flex-1 text-left py-3 pr-4 pl-2 hover:bg-stone-50/80 transition-colors min-w-0">
                      <p className="text-stone-600 text-sm whitespace-pre-wrap line-clamp-3">{stripHtml(child.content)}</p>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {rootNotes.map((node) => (
          <div key={node.id}>
            <button type="button" onClick={openNode(node.id)} className="w-full text-left p-4 rounded-2xl border border-stone-200 bg-section hover:border-primary/30 hover:bg-white transition-colors">
              <p className="text-stone-800 whitespace-pre-wrap line-clamp-3 text-sm">{stripHtml(node.content)}</p>
            </button>
          </div>
        ))}
      </div>
      <NodeDetailModal isOpen={selectedNodeId !== null} onClose={() => setSelectedNodeId(null)} node={selectedNode} edges={edges} nodes={nodes} onDeleteEdge={handleDeleteEdge} onDeleteNode={handleDeleteNode} />
    </>
  );
}
