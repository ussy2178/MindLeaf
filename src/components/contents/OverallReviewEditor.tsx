"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { updateOverallReview } from "@/app/contents/actions";

const RichEditor = dynamic(
  () => import("@/components/ui/RichEditor").then((mod) => mod.RichEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-[150px] w-full animate-pulse rounded-md bg-slate-100" aria-hidden />
    ),
  }
);

/** DB にプレーンテキストで保存されていた場合に HTML として扱えるよう正規化する */
function normalizeReviewHtml(raw: string | null): string {
  if (!raw || !raw.trim()) return "";
  const t = raw.trim();
  if (t.startsWith("<") && t.endsWith(">")) return raw;
  return "<p>" + t.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>") + "</p>";
}

type OverallReviewEditorProps = {
  contentId: string;
  initialReview: string | null;
};

export function OverallReviewEditor({ contentId, initialReview }: OverallReviewEditorProps) {
  const router = useRouter();
  const initialHtml = useMemo(() => normalizeReviewHtml(initialReview ?? ""), [initialReview]);
  const [review, setReview] = useState(initialHtml);
  const [isPending, setIsPending] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    setIsPending(true);
    setSaved(false);
    const result = await updateOverallReview(contentId, review);
    setIsPending(false);
    if (result && "success" in result) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }, [contentId, review, router]);

  return (
    <div className="space-y-3">
      <RichEditor
        key={contentId}
        value={review}
        onChange={setReview}
        placeholder="Type '/' for commands..."
        minHeight="160px"
        className="resize-y"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-2 bg-primary text-white text-sm rounded-xl hover:bg-primary-600 disabled:opacity-50"
        >
          {isPending ? "保存中..." : "感想を保存"}
        </button>
        {saved && (
          <span className="text-sm text-green-600">保存しました</span>
        )}
      </div>
    </div>
  );
}
