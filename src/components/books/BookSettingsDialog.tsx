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
import { updateBook, deleteBook } from "@/app/books/actions";

type Book = {
  id: string;
  title: string;
  author: string | null;
  cover_image_url: string | null;
};

type BookSettingsDialogProps = {
  book: Book;
  triggerLabel?: string;
};

export function BookSettingsDialog({ book, triggerLabel = "編集" }: BookSettingsDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(book.cover_image_url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTitle(book.title);
      setAuthor(book.author ?? "");
      setCoverImageUrl(book.cover_image_url ?? "");
      setError(null);
    }
    setOpen(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const result = await updateBook(book.id, {
      title: title.trim(),
      author: author.trim() || null,
      cover_image_url: coverImageUrl.trim() || null,
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
    await deleteBook(book.id);
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
        <DialogContent>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="閉じる"
              className="absolute top-4 right-4 p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </DialogClose>
          <DialogHeader>
            <DialogTitle>本の設定</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="book-settings-title" className="block text-sm font-medium text-stone-700 mb-1">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                id="book-settings-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="book-settings-author" className="block text-sm font-medium text-stone-700 mb-1">
                著者名
              </label>
              <input
                id="book-settings-author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="book-settings-cover" className="block text-sm font-medium text-stone-700 mb-1">
                画像URL
              </label>
              <input
                id="book-settings-cover"
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
              >
                {isPending ? "保存中..." : "保存する"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                <span aria-hidden>🗑</span>
                この本を削除する
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>この本を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この本を削除すると、登録されたすべての思考の記録とマインドマップも完全に削除されます。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
