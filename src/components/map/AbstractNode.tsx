"use client";

import { Handle, Position, useStore, type NodeProps } from "reactflow";
import { stripHtml } from "@/lib/html";

export type AbstractNodeData = {
  content: string;
  interpretation: string | null;
  layer: number;
};

const handleBase =
  "!w-2.5 !h-2.5 !border-2 !bg-white !border-primary-400 transition-opacity opacity-0 group-hover:opacity-100";

export function AbstractNode({ data }: NodeProps<AbstractNodeData>) {
  const isConnecting = useStore((s) => s.connectionNodeId != null);

  return (
    <div className="group relative px-4 py-3 min-w-[180px] max-w-[280px] rounded-lg bg-orange-50 shadow-sm">
      <Handle
        type="target"
        position={Position.Top}
        className={`${handleBase} ${isConnecting ? "!opacity-100" : ""}`}
      />
      <p className="text-stone-800 text-sm leading-relaxed whitespace-pre-wrap">
        {stripHtml(data.content)}
      </p>
      <Handle
        type="source"
        position={Position.Bottom}
        className={`${handleBase} ${isConnecting ? "!opacity-100" : ""}`}
      />
    </div>
  );
}
