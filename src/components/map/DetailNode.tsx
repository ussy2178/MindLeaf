"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { Lightbulb } from "lucide-react";

export type DetailNodeData = {
  content: string;
  interpretation: string | null;
  layer: number;
  /** 引用（quote）か自分の解釈（thought）か */
  kind?: "quote" | "thought";
};

export function DetailNode({ data }: NodeProps<DetailNodeData>) {
  const isQuote = data.kind === "quote";
  const isReflection = data.kind === "thought";

  return (
    <div
      className={`relative min-w-[120px] max-w-[260px] rounded-md pt-1 pb-0.5 bg-transparent transition-colors hover:bg-stone-100/50 ${
        isQuote ? "border-l-2 border-stone-300 pl-3 pr-2 py-2" : "pl-2 pr-2 py-2"
      }`}
    >
      {/* ドットと Handle を重ねて配置（線がドットの中央から伸びる） */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 flex items-center justify-center">
        <span className="w-3 h-3 rounded-full bg-primary-400 shrink-0" />
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !min-w-3 !min-h-3 !border-0 !bg-transparent !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2"
        />
      </div>
      <div className="pt-4 flex gap-2 min-w-0">
        {isReflection && (
          <span className="shrink-0 text-orange-400 mt-0.5" aria-hidden>
            <Lightbulb className="size-3.5" />
          </span>
        )}
        <p className="text-stone-800 text-sm leading-relaxed whitespace-pre-wrap line-clamp-4 flex-1 min-w-0 text-left">
          {data.content}
        </p>
      </div>
    </div>
  );
}
