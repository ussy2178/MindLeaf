"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createBook } from "@/app/books/actions";

type FormState =
  | { error?: string }
  | { success?: boolean; bookId?: string }
  | null;

export function BookNewForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (_prev: FormState, formData: FormData) => {
      return createBook(formData);
    },
    null
  );

  if (state && "success" in state && state.success && state.bookId) {
    return (
      <div className="rounded-2xl border border-primary-200 bg-primary-50 p-6 text-center">
        <p className="text-primary-800 font-medium mb-4">本を登録しました。</p>
        <Link
          href="/books"
          className="text-primary-600 hover:underline"
        >
          本一覧を見る
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-stone-700 mb-1">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="例: 人を動かす"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>
      <div>
        <label htmlFor="author" className="block text-sm font-medium text-stone-700 mb-1">
          著者
        </label>
        <input
          id="author"
          name="author"
          type="text"
          placeholder="例: D・カーネギー"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>
      <div>
        <label htmlFor="cover_image_url" className="block text-sm font-medium text-stone-700 mb-1">
          書影URL
        </label>
        <input
          id="cover_image_url"
          name="cover_image_url"
          type="url"
          placeholder="https://..."
          className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>
      {state && "error" in state && state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={!!isPending}
          className="px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-600 disabled:opacity-50"
        >
          {isPending ? "登録中..." : "登録する"}
        </button>
        <Link
          href="/"
          className="px-4 py-2.5 border border-stone-200 rounded-xl hover:bg-stone-50 inline-block"
        >
          キャンセル
        </Link>
      </div>
    </form>
  );
}
