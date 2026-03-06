"use client";

import { Handle, Position, useStore, type NodeProps } from "reactflow";

export type BookRootNodeData = {
  content: string;
  interpretation: string | null;
  layer: number;
};

const handleBase =
  "!w-2.5 !h-2.5 !border-2 !bg-white !border-primary transition-opacity opacity-0 group-hover:opacity-100";

export function BookRootNode({ data }: NodeProps<BookRootNodeData>) {
  const isConnecting = useStore((s) => s.connectionNodeId != null);

  return (
    <div className="group relative px-6 py-4 min-w-[200px] rounded-xl bg-white shadow-md border-4 border-primary">
      <Handle
        type="target"
        position={Position.Top}
        className={`${handleBase} ${isConnecting ? "!opacity-100" : ""}`}
      />
      <p className="text-lg font-bold leading-snug text-stone-900">{data.content}</p>
      <Handle
        type="source"
        position={Position.Bottom}
        className={`${handleBase} ${isConnecting ? "!opacity-100" : ""}`}
      />
    </div>
  );
}
