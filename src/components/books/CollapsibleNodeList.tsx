"use client";

import { useState } from "react";
import type { MindMapNode } from "@/components/map/MindMap";
import type { NodeDetailModalEdge } from "@/components/map/NodeDetailModal";
import { NodeListWithModal } from "./NodeListWithModal";

type CollapsibleNodeListProps = {
  nodes: MindMapNode[];
  edges: NodeDetailModalEdge[];
};

export function CollapsibleNodeList({ nodes, edges }: CollapsibleNodeListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const count = nodes.length;

  return (
    <section className="mb-8 rounded-2xl border border-stone-200 bg-section overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-stone-50/80 transition-colors"
        aria-expanded={isOpen}
      >
        <h2 className="text-sm font-semibold text-stone-600 min-w-0 truncate">
          思考の記録（引用・解釈）
        </h2>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-stone-400 text-sm tabular-nums">{count}件</span>
          <span
            className={`text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            aria-hidden
          >
            ▼
          </span>
        </span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-0 border-t border-stone-100">
          <NodeListWithModal nodes={nodes} edges={edges} />
        </div>
      )}
    </section>
  );
}
