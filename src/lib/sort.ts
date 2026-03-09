export type SortType = "priority" | "newest" | "seen_date" | "rating";

export type SortableItem = {
  status: string | null;
  rating: number | null;
  created_at: string | null;
  seen_on: string | null;
};

export const SORT_OPTIONS: { value: SortType; label: string }[] = [
  { value: "priority", label: "Current Status" },
  { value: "newest", label: "Recently Added" },
  { value: "seen_date", label: "Recently Finished" },
  { value: "rating", label: "Highest Rated" },
];

const STATUS_PRIORITY: Record<string, number> = { Now: 0, Unseen: 1, Seen: 2 };

export function sortItems<T extends SortableItem>(items: T[], sort: SortType): T[] {
  const sorted = [...items];
  switch (sort) {
    case "priority":
      sorted.sort((a, b) => {
        const pa = STATUS_PRIORITY[a.status ?? "Unseen"] ?? 1;
        const pb = STATUS_PRIORITY[b.status ?? "Unseen"] ?? 1;
        if (pa !== pb) return pa - pb;
        return (b.created_at ?? "").localeCompare(a.created_at ?? "");
      });
      break;
    case "newest":
      sorted.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
      break;
    case "seen_date":
      sorted.sort((a, b) => {
        if (!a.seen_on && !b.seen_on) return 0;
        if (!a.seen_on) return 1;
        if (!b.seen_on) return -1;
        return b.seen_on.localeCompare(a.seen_on);
      });
      break;
    case "rating":
      sorted.sort((a, b) => {
        const ra = a.rating ?? 0;
        const rb = b.rating ?? 0;
        if (rb !== ra) return rb - ra;
        return (b.created_at ?? "").localeCompare(a.created_at ?? "");
      });
      break;
  }
  return sorted;
}
