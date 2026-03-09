"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Circle, Play, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { updateContentStatus } from "@/app/contents/actions";

const STATUS_CONFIG: Record<string, { label: string; className: string; iconClass: string }> = {
  Unseen: {
    label: "Unseen",
    className: "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 shadow-none",
    iconClass: "text-slate-400",
  },
  Now: {
    label: "Now",
    className: "bg-blue-100 text-blue-900 border-none hover:bg-blue-200 shadow-none",
    iconClass: "text-blue-600",
  },
  Seen: {
    label: "Seen",
    className: "bg-green-100 text-green-700 border-none hover:bg-green-200 shadow-none",
    iconClass: "text-green-700",
  },
};

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Unseen: Circle,
  Now: Play,
  Seen: CheckCircle2,
};

const STATUS_OPTIONS = ["Unseen", "Now", "Seen"] as const;

type StatusBadgeInlineProps = {
  contentId: string;
  status: string | null;
};

export function StatusBadgeInline({ contentId, status }: StatusBadgeInlineProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState(status);
  const [isPending, startTransition] = useTransition();

  const current = optimisticStatus ?? "Unseen";
  const config = STATUS_CONFIG[current] ?? STATUS_CONFIG.Unseen;

  const handleSelect = (next: string) => {
    if (next === current) {
      setOpen(false);
      return;
    }
    setOptimisticStatus(next);
    setOpen(false);
    startTransition(async () => {
      await updateContentStatus(contentId, next as "Unseen" | "Now" | "Seen");
      router.refresh();
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="cursor-pointer" disabled={isPending}>
          <Badge
            className={`${config.className} transition-colors gap-0.5 ${isPending ? "opacity-60" : ""}`}
          >
            {(() => { const Icon = STATUS_ICON[current] ?? Circle; return <Icon className={`w-3 h-3 ${config.iconClass}`} />; })()}
            {config.label}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-0.5 min-w-[120px]">
        {STATUS_OPTIONS.map((opt) => {
          const optConfig = STATUS_CONFIG[opt];
          const Icon = STATUS_ICON[opt] ?? Circle;
          const isActive = opt === current;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => handleSelect(opt)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                isActive
                  ? "bg-stone-100 text-stone-900"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${optConfig.iconClass}`} />
              {optConfig.label}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
