"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { TypeBadgeInline } from "./TypeBadgeInline";
import { StatusBadgeInline } from "./StatusBadgeInline";
import { SortSelect } from "./SortSelect";
import { sortItems, type SortType } from "@/lib/sort";

type ContentItem = {
  id: string;
  title: string;
  author: string | null;
  cover_image_url: string | null;
  content_type: string | null;
  status: string | null;
  rating: number | null;
  is_on_map: boolean;
  created_at: string | null;
  seen_on: string | null;
};

function RatingStars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span className="text-amber-500 text-[10px] font-medium">
      {"★".repeat(Math.min(rating, 4))}
      {rating >= 4 && "+"}
    </span>
  );
}

type FilterType = "all" | "Book" | "Movie" | "Anime" | "Drama";

export function ContentListClient({ contents }: { contents: ContentItem[] }) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("priority");

  const filtered = useMemo(() => {
    const byType = filter === "all" ? contents : contents.filter((c) => c.content_type === filter);
    return sortItems(byType, sort);
  }, [contents, filter, sort]);

  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "Book", label: "Book" },
    { value: "Movie", label: "Movie" },
    { value: "Anime", label: "Anime" },
    { value: "Drama", label: "Drama" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-primary text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto">
          <SortSelect value={sort} onChange={setSort} />
        </div>
      </div>

      {!filtered.length ? (
        <p className="text-stone-500 text-sm">該当するコンテンツがありません。</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <div className="flex items-center gap-4 p-4 rounded-2xl border border-stone-200 bg-section hover:border-primary/20 hover:bg-white transition-colors">
                <Link href={`/contents/${item.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                  {item.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.cover_image_url}
                      alt=""
                      className="w-12 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-16 rounded bg-stone-200 flex items-center justify-center text-stone-400 text-xs">
                      No img
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    {item.author && (
                      <p className="text-sm text-stone-500 truncate">{item.author}</p>
                    )}
                  </div>
                </Link>
                <div className="flex flex-wrap items-center gap-1 shrink-0">
                  <TypeBadgeInline contentId={item.id} contentType={item.content_type} />
                  <StatusBadgeInline contentId={item.id} status={item.status} />
                  <RatingStars rating={item.rating} />
                  {!item.is_on_map && (
                    <MapPinOff className="w-3.5 h-3.5 text-stone-400" aria-label="Off map" />
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
