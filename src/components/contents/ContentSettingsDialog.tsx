"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { updateContent, deleteContent } from "@/app/contents/actions";
import type { ContentType, ContentStatus } from "@/lib/types";

type ContentForDialog = {
  id: string;
  title: string;
  author: string | null;
  cover_image_url: string | null;
  content_type: ContentType | null;
  status: ContentStatus | null;
  seen_on: string | null;
  rating: number | null;
  is_on_map: boolean;
};

type ContentSettingsDialogProps = {
  content: ContentForDialog;
  triggerLabel?: string;
};

const CONTENT_TYPES = [
  { value: "Book", label: "Book" },
  { value: "Movie", label: "Movie" },
  { value: "Anime", label: "Anime" },
  { value: "Drama", label: "Drama" },
] as const;

const STATUS_OPTIONS = [
  { value: "Unseen", label: "Unseen" },
  { value: "Now", label: "Now" },
  { value: "Seen", label: "Seen" },
] as const;

const RATING_OPTIONS = [
  { value: 2, label: "★★" },
  { value: 3, label: "★★★" },
  { value: 4, label: "★★★★+" },
] as const;

export function ContentSettingsDialog({ content, triggerLabel = "編集" }: ContentSettingsDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [title, setTitle] = useState(content.title);
  const [author, setAuthor] = useState(content.author ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(content.cover_image_url ?? "");
  const [contentType, setContentType] = useState<ContentType>(content.content_type ?? "Book");
  const [status, setStatus] = useState<ContentStatus>(content.status ?? "Unseen");
  const [seenOn, setSeenOn] = useState(content.seen_on ?? "");
  const [rating, setRating] = useState<number | null>(content.rating);
  const [isOnMap, setIsOnMap] = useState(content.is_on_map);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTitle(content.title);
      setAuthor(content.author ?? "");
      setCoverImageUrl(content.cover_image_url ?? "");
      setContentType(content.content_type ?? "Book");
      setStatus(content.status ?? "Unseen");
      setSeenOn(content.seen_on ?? "");
      setRating(content.rating);
      setIsOnMap(content.is_on_map);
      setError(null);
    }
    setOpen(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const result = await updateContent(content.id, {
      title: title.trim(),
      author: author.trim() || null,
      cover_image_url: coverImageUrl.trim() || null,
      content_type: contentType,
      status,
      seen_on: seenOn.trim() || null,
      rating,
      is_on_map: isOnMap,
    });
    setIsPending(false);
    if (result && "error" in result) {
      setError(result.error ?? null);
      return;
    }
    router.refresh();
    setOpen(false);
  };

  const handleDeleteConfirm = async () => {
    await deleteContent(content.id);
    setDeleteConfirmOpen(false);
    setOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            title={triggerLabel}
          >
            <span aria-hidden>⚙</span>
            {triggerLabel}
          </button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogClose asChild>
            <button
              type="button"
              aria-label="閉じる"
              className="absolute top-4 right-4 p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </DialogClose>
          <DialogHeader>
            <DialogTitle>コンテンツの設定</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="cs-content-type" className="block text-sm font-medium text-stone-700 mb-1">種別</label>
              <select id="cs-content-type" value={contentType} onChange={(e) => setContentType(e.target.value as ContentType)} className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white">
                {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="cs-title" className="block text-sm font-medium text-stone-700 mb-1">タイトル <span className="text-red-500">*</span></label>
              <input id="cs-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label htmlFor="cs-author" className="block text-sm font-medium text-stone-700 mb-1">著者 / 監督</label>
              <input id="cs-author" type="text" value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label htmlFor="cs-status" className="block text-sm font-medium text-stone-700 mb-1">ステータス</label>
              <select id="cs-status" value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)} className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white">
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="cs-seen-on" className="block text-sm font-medium text-stone-700 mb-1">視聴日 / 読了日</label>
              <input id="cs-seen-on" type="date" value={seenOn} onChange={(e) => setSeenOn(e.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label htmlFor="cs-rating" className="block text-sm font-medium text-stone-700 mb-1">評価</label>
              <select id="cs-rating" value={rating ?? ""} onChange={(e) => setRating(e.target.value ? Number(e.target.value) : null)} className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white">
                <option value="">Unrated</option>
                {RATING_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="cs-cover" className="block text-sm font-medium text-stone-700 mb-1">カバー画像URL</label>
              <input id="cs-cover" type="url" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="cs-is-on-map" className="text-sm font-medium text-stone-700 cursor-pointer flex items-center gap-2">
                <input id="cs-is-on-map" type="checkbox" checked={isOnMap} onChange={(e) => setIsOnMap(e.target.checked)} className="rounded border-stone-300 text-primary-600 focus:ring-primary-500 h-4 w-4" />
                マインドマップに表示する
              </label>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex flex-col gap-3 pt-2">
              <button type="submit" disabled={isPending} className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50">
                {isPending ? "保存中..." : "保存する"}
              </button>
              <button type="button" onClick={() => setDeleteConfirmOpen(true)} className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100">
                <span aria-hidden>🗑</span>
                このコンテンツを削除する
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>このコンテンツを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              このコンテンツを削除すると、登録されたすべての思考の記録とマインドマップも完全に削除されます。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
