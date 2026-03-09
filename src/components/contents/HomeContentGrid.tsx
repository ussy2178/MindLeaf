"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Circle, Play, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SortSelect } from "./SortSelect";
import { sortItems, type SortType } from "@/lib/sort";

type HomeContentItem = {
  id: string;
  title: string;
  author: string | null;
  cover_image_url: string | null;
  content_type: string | null;
  status: string | null;
  rating: number | null;
  created_at: string | null;
  seen_on: string | null;
};

const TYPE_STYLES: Record<string, string> = {
  Book: "bg-amber-100 text-amber-900 border-none shadow-none",
  Movie: "bg-purple-100 text-purple-900 border-none shadow-none",
  Anime: "bg-sky-100 text-sky-900 border-none shadow-none",
  Drama: "bg-rose-100 text-rose-900 border-none shadow-none",
};

const STATUS_STYLES: Record<string, { className: string; iconClass: string }> = {
  Unseen: { className: "bg-slate-50 text-slate-400 border-slate-200 shadow-none", iconClass: "text-slate-400" },
  Now: { className: "bg-blue-100 text-blue-900 border-none shadow-none", iconClass: "text-blue-600" },
  Seen: { className: "bg-green-100 text-green-700 border-none shadow-none", iconClass: "text-green-700" },
};

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Unseen: Circle,
  Now: Play,
  Seen: CheckCircle2,
};

export function HomeContentGrid({ contents }: { contents: HomeContentItem[] }) {
  const [sort, setSort] = useState<SortType>("priority");

  const sorted = useMemo(() => sortItems(contents, sort), [contents, sort]);

  return (
    <>
      <div className="relative flex items-center justify-center mb-6">
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">
          登録されているコンテンツ
        </h2>
        <div className="absolute right-0">
          <SortSelect value={sort} onChange={setSort} />
        </div>
      </div>

      {!sorted.length ? (
        <p className="text-stone-400 text-sm text-center">
          まだコンテンツが登録されていません。
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6 justify-items-center">
          {sorted.map((item) => (
            <Link
              key={item.id}
              href={`/contents/${item.id}`}
              className="group block w-full max-w-[200px] rounded-2xl border border-stone-200 bg-white overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all"
            >
              <div className="aspect-[3/4] bg-section overflow-hidden">
                {item.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.cover_image_url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">
                    No img
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-stone-100">
                <p className="font-medium text-stone-900 text-sm line-clamp-2 group-hover:text-primary">
                  {item.title}
                </p>
                {item.author && (
                  <p className="text-xs text-stone-400 mt-0.5 truncate">
                    {item.author}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {item.content_type && (
                    <Badge className={TYPE_STYLES[item.content_type] ?? "bg-stone-100 text-stone-600 border-stone-200"}>
                      {item.content_type}
                    </Badge>
                  )}
                  {item.status && STATUS_STYLES[item.status] && (() => {
                    const s = STATUS_STYLES[item.status!];
                    const Icon = STATUS_ICON[item.status!] ?? Circle;
                    return (
                      <Badge className={`${s.className} gap-0.5`}>
                        <Icon className={`w-3 h-3 ${s.iconClass}`} />
                        {item.status}
                      </Badge>
                    );
                  })()}
                  {item.rating && (
                    <span className="text-amber-500 text-[10px] font-medium">
                      {"★".repeat(Math.min(item.rating, 4))}{item.rating >= 4 && "+"}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
