"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { updateContentType } from "@/app/contents/actions";

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  Book: {
    label: "Book",
    className: "bg-amber-100 text-amber-900 border-none hover:bg-amber-200 shadow-none",
  },
  Movie: {
    label: "Movie",
    className: "bg-purple-100 text-purple-900 border-none hover:bg-purple-200 shadow-none",
  },
  Anime: {
    label: "Anime",
    className: "bg-sky-100 text-sky-900 border-none hover:bg-sky-200 shadow-none",
  },
  Drama: {
    label: "Drama",
    className: "bg-rose-100 text-rose-900 border-none hover:bg-rose-200 shadow-none",
  },
};

const TYPE_DOT: Record<string, string> = {
  Book: "bg-amber-400",
  Movie: "bg-purple-400",
  Anime: "bg-sky-400",
  Drama: "bg-rose-400",
};

const TYPE_OPTIONS = ["Book", "Movie", "Anime", "Drama"] as const;

type TypeBadgeInlineProps = {
  contentId: string;
  contentType: string | null;
};

export function TypeBadgeInline({ contentId, contentType }: TypeBadgeInlineProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [optimisticType, setOptimisticType] = useState(contentType);
  const [isPending, startTransition] = useTransition();

  const current = optimisticType ?? "Book";
  const config = TYPE_CONFIG[current] ?? TYPE_CONFIG.Book;

  const handleSelect = (next: string) => {
    if (next === current) {
      setOpen(false);
      return;
    }
    setOptimisticType(next);
    setOpen(false);
    startTransition(async () => {
      await updateContentType(contentId, next as "Book" | "Movie" | "Anime" | "Drama");
      router.refresh();
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="cursor-pointer" disabled={isPending}>
          <Badge
            className={`${config.className} transition-colors ${isPending ? "opacity-60" : ""}`}
          >
            {config.label}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-0.5 min-w-[120px]">
        {TYPE_OPTIONS.map((opt) => {
          const optConfig = TYPE_CONFIG[opt];
          const isActive = opt === current;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => handleSelect(opt)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-stone-100 text-stone-900"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${TYPE_DOT[opt]}`} />
              {optConfig.label}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
