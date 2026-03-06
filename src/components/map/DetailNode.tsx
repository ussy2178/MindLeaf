"use client";

import { Handle, Position, type NodeProps } from "reactflow";

export type DetailNodeData = {
  content: string;
  interpretation: string | null;
  layer: number;
};

export function DetailNode({ data }: NodeProps<DetailNodeData>) {
  return (
    <div className="relative min-w-[120px] max-w-[260px] pt-1 pb-0.5">
      {/* ドットと Handle を重ねて配置（線がドットの中央から伸びる） */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 flex items-center justify-center">
        <span className="w-3 h-3 rounded-full bg-primary-400 shrink-0" />
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !min-w-3 !min-h-3 !border-0 !bg-transparent !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2"
        />
      </div>
      <p className="text-stone-800 text-sm leading-relaxed whitespace-pre-wrap line-clamp-4 pt-4 text-center">
        {data.content}
      </p>
    </div>
  );
}
