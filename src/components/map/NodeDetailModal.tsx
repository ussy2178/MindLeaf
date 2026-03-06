"use client";

import { useState } from "react";
import type { MindMapNode } from "./MindMap";
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

/** モーダル用のエッジ型（React Flow の Edge とも DB 由来の { id, source, target } とも互換） */
export type NodeDetailModalEdge = {
  id: string;
  source: string;
  target: string;
};

type NodeDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  node: MindMapNode | null;
  edges: NodeDetailModalEdge[];
  nodes: MindMapNode[];
  onDeleteEdge: (edgeId: string) => void;
  onDeleteNode?: (nodeId: string) => void | Promise<boolean | void>;
};

export function NodeDetailModal({
  isOpen,
  onClose,
  node,
  edges,
  nodes,
  onDeleteEdge,
  onDeleteNode,
}: NodeDetailModalProps) {
  const [deleteNodeConfirmOpen, setDeleteNodeConfirmOpen] = useState(false);

  if (!isOpen || !node) return null;

  const connectedEdges = edges.filter(
    (e) => e.source === node.id || e.target === node.id
  );

  const getOtherNode = (edge: NodeDetailModalEdge) => {
    const otherId = edge.source === node.id ? edge.target : edge.source;
    return nodes.find((n) => n.id === otherId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="node-detail-title"
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <h2 id="node-detail-title" className="text-lg font-semibold text-stone-800">
            ノードの詳細
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-700"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          <div>
            <p className="text-stone-800 whitespace-pre-wrap text-sm mb-2">
              {node.content}
            </p>
            {node.interpretation && (
              <div className="pt-2 border-t border-stone-100">
                <p className="text-stone-600 whitespace-pre-wrap text-sm">
                  {node.interpretation}
                </p>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-stone-700 mb-2">
              接続済みエッジ（{connectedEdges.length}件）
            </h3>
            {connectedEdges.length === 0 ? (
              <p className="text-sm text-stone-500">接続はありません。</p>
            ) : (
              <ul className="space-y-2">
                {connectedEdges.map((edge: NodeDetailModalEdge) => {
                  const other = getOtherNode(edge);
                  const label = other
                    ? (other.content.length > 50
                        ? `${other.content.slice(0, 50)}…`
                        : other.content)
                    : "（不明）";
                  return (
                    <li
                      key={edge.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-stone-50 border border-stone-200"
                    >
                      <span className="text-sm text-stone-700 truncate flex-1 min-w-0">
                        {edge.source === node.id ? "→ " : "← "}
                        {label}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteEdge(edge.id)}
                        className="flex-shrink-0 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded"
                      >
                        削除
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {onDeleteNode && (
            <div className="pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setDeleteNodeConfirmOpen(true)}
                className="flex items-center gap-2 w-full justify-center px-3 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 hover:border-red-300 transition-colors"
              >
                <span aria-hidden>🗑</span>
                このノードを削除する
              </button>
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        open={deleteNodeConfirmOpen}
        onOpenChange={setDeleteNodeConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>このノードを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              このノードを削除すると、接続されている線もすべて削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (onDeleteNode && node) {
                  const ok = await onDeleteNode(node.id);
                  if (ok !== false) {
                    setDeleteNodeConfirmOpen(false);
                    onClose();
                  }
                }
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
