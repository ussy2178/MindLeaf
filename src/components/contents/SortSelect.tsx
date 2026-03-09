"use client";

import { ArrowUpDown } from "lucide-react";
import { SORT_OPTIONS, type SortType } from "@/lib/sort";

type SortSelectProps = {
  value: SortType;
  onChange: (value: SortType) => void;
};

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <div className="flex items-center gap-1">
      <ArrowUpDown className="w-3 h-3 text-stone-300 shrink-0" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortType)}
        className="w-[140px] appearance-none rounded-md border-none bg-transparent px-1 py-1 text-xs text-stone-400 focus:outline-none focus:ring-0 cursor-pointer hover:text-stone-600 transition-colors"
      >
        {SORT_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}
