"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createContent } from "@/app/contents/actions";

type FormState =
  | { error?: string }
  | { success?: boolean; contentId?: string }
  | null;

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
  { value: "2", label: "★★" },
  { value: "3", label: "★★★" },
  { value: "4", label: "★★★★+" },
] as const;

export function ContentAddForm() {
  const [isOnMap, setIsOnMap] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("Unseen");

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (_prev: FormState, formData: FormData) => {
      formData.set("is_on_map", isOnMap ? "true" : "false");
      return createContent(formData);
    },
    null
  );

  if (state && "success" in state && state.success && state.contentId) {
    return (
      <div className="rounded-2xl border border-primary-200 bg-primary-50 p-6 text-center">
        <p className="text-primary-800 font-medium mb-4">コンテンツを登録しました。</p>
        <Link href="/contents" className="text-primary-600 hover:underline">
          コンテンツ一覧を見る
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* 種別 */}
      <div>
        <label htmlFor="content_type" className="block text-sm font-medium text-stone-700 mb-1">
          種別 <span className="text-red-500">*</span>
        </label>
        <select
          id="content_type"
          name="content_type"
          defaultValue="Book"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
        >
          {CONTENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* タイトル */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-stone-700 mb-1">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="例: 人を動かす / 千と千尋の神隠し"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {/* 著者/監督 */}
      <div>
        <label htmlFor="author" className="block text-sm font-medium text-stone-700 mb-1">
          著者 / 監督
        </label>
        <input
          id="author"
          name="author"
          type="text"
          placeholder="例: D・カーネギー / 宮崎駿"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {/* 状態 */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-stone-700 mb-1">
          ステータス
        </label>
        <select
          id="status"
          name="status"
          value={selectedStatus}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedStatus(v);
            if (v === "Unseen") setIsOnMap(false);
            else setIsOnMap(true);
          }}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* 実施日 */}
      <div>
        <label htmlFor="seen_on" className="block text-sm font-medium text-stone-700 mb-1">
          視聴日 / 読了日
        </label>
        <input
          id="seen_on"
          name="seen_on"
          type="date"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {/* 評価 */}
      <div>
        <label htmlFor="rating" className="block text-sm font-medium text-stone-700 mb-1">
          評価
        </label>
        <select
          id="rating"
          name="rating"
          defaultValue=""
          className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
        >
          <option value="">Unrated</option>
          {RATING_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* 画像URL */}
      <div>
        <label htmlFor="cover_image_url" className="block text-sm font-medium text-stone-700 mb-1">
          カバー画像URL
        </label>
        <input
          id="cover_image_url"
          name="cover_image_url"
          type="url"
          placeholder="https://..."
          className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {/* マインドマップ表示 */}
      <div className="flex items-center gap-3">
        <label htmlFor="is_on_map" className="text-sm font-medium text-stone-700 cursor-pointer flex items-center gap-2">
          <input
            id="is_on_map"
            type="checkbox"
            checked={isOnMap}
            onChange={(e) => setIsOnMap(e.target.checked)}
            className="rounded border-stone-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
          />
          マインドマップに表示する
        </label>
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
