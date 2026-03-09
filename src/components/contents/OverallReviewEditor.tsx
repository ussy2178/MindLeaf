"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { updateOverallReview } from "@/app/contents/actions";

type OverallReviewEditorProps = {
  contentId: string;
  initialReview: string | null;
};

export function OverallReviewEditor({ contentId, initialReview }: OverallReviewEditorProps) {
  const router = useRouter();
  const [review, setReview] = useState(initialReview ?? "");
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
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="この作品全体の感想を自由に書いてください..."
        className="w-full min-h-[160px] rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-y"
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
