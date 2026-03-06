"use client";

import { useState, useMemo, useEffect } from "react";
import { useActionState } from "react";
import { createNode } from "@/app/books/actions";

type FormState = { error?: string } | { success?: boolean } | null;

export type ParentNodeOption = {
  id: string;
  layer: number;
  content: string;
};

export function NodeAddForm({
  bookId,
  nodes = [],
}: {
  bookId: string;
  nodes?: ParentNodeOption[];
}) {
  const [layer, setLayer] = useState<1 | 2>(2);
  const [interpretationExpanded, setInterpretationExpanded] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    createNode,
    null
  );

  useEffect(() => {
    if (state && "success" in state && state.success) {
      setShowSuccessMessage(true);
      const t = setTimeout(() => setShowSuccessMessage(false), 3000);
      return () => clearTimeout(t);
    }
  }, [state]);

  const isLayer1 = layer === 1;

  const bookRootNode = useMemo(
    () => nodes.find((n) => n.layer === 0),
    [nodes]
  );
  const parentOptions = useMemo(
    () => nodes.filter((n) => n.layer === 0 || n.layer === 1),
    [nodes]
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="bookId" value={bookId} readOnly aria-hidden />
      {/* レイヤー1のときは type を thought で送信 */}
      {isLayer1 && (
        <input type="hidden" name="type" value="thought" readOnly aria-hidden />
      )}
      {/* レイヤー1のときは親を本（Layer 0）に固定 */}
      {isLayer1 && bookRootNode && (
        <input type="hidden" name="parentId" value={bookRootNode.id} readOnly aria-hidden />
      )}

      {/* レイヤー選択（先頭で状態を決める） */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          レイヤー
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="layer"
              value="1"
              checked={layer === 1}
              onChange={() => {
                setLayer(1);
                setInterpretationExpanded(false);
              }}
              className="rounded border-stone-300 text-primary-600 focus:ring-primary-500"
            />
            <span>1: 抽象的なまとめ</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="layer"
              value="2"
              checked={layer === 2}
              onChange={() => setLayer(2)}
              className="rounded border-stone-300 text-primary-600 focus:ring-primary-500"
            />
            <span>2: 具体的な断片</span>
          </label>
        </div>
      </div>

      {/* 接続先の親ノード（レイヤー2のみ表示） */}
      {!isLayer1 && parentOptions.length > 0 && (
        <div>
          <label htmlFor="parentId" className="block text-sm font-medium text-stone-700 mb-2">
            接続先の親ノード
          </label>
          <select
            id="parentId"
            name="parentId"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {parentOptions.map((n) => (
              <option key={n.id} value={n.id}>
                {n.layer === 0 ? "Layer 0（本のタイトル）: " : "Layer 1（まとめ）: "}
                {n.content.length > 40 ? `${n.content.slice(0, 40)}…` : n.content}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 種類（レイヤー2のみ表示） */}
      {!isLayer1 && (
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            種類
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="quote"
                defaultChecked
                className="rounded border-stone-300 text-primary-600 focus:ring-primary-500"
              />
              <span>引用</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="thought"
                className="rounded border-stone-300 text-primary-600 focus:ring-primary-500"
              />
              <span>自分の解釈</span>
            </label>
          </div>
        </div>
      )}

      {/* 内容（常に必須） */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-stone-700 mb-1">
          内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={4}
          placeholder={isLayer1 ? "抽象的なまとめを入力..." : "引用や解釈のテキストを入力..."}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors"
        />
      </div>

      {/* 自分の考え・思い */}
      {isLayer1 ? (
        <div className="overflow-hidden transition-all duration-200 ease-out">
          {!interpretationExpanded ? (
            <button
              type="button"
              onClick={() => setInterpretationExpanded(true)}
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              さらに詳しく書く（任意）
            </button>
          ) : (
            <div
              className="grid transition-[grid-template-rows] duration-200 ease-out"
              style={{ gridTemplateRows: "1fr" }}
            >
              <div className="min-h-0">
                <label htmlFor="interpretation" className="block text-sm font-medium text-stone-700 mb-1">
                  自分の考え・思い・感じたこと
                </label>
                <textarea
                  id="interpretation"
                  name="interpretation"
                  rows={3}
                  placeholder="この表現を読んでどう感じたか、自分なりの解釈をメモしてください"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className="overflow-hidden transition-all duration-200 ease-out"
          style={{ display: "grid", gridTemplateRows: "1fr" }}
        >
          <div className="min-w-0">
            <label htmlFor="interpretation-layer2" className="block text-sm font-medium text-stone-700 mb-1">
              自分の考え・思い・感じたこと
            </label>
            <textarea
              id="interpretation-layer2"
              name="interpretation"
              rows={3}
              placeholder="この表現を読んでどう感じたか、自分なりの解釈をメモしてください"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      )}

      {state && "error" in state && state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {showSuccessMessage && state && "success" in state && state.success && (
        <p className="text-sm text-primary-600">ノードを追加しました。</p>
      )}

      <button
        type="submit"
        disabled={!!isPending}
        className="px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-opacity"
      >
        {isPending ? "追加中..." : "追加する"}
      </button>
    </form>
  );
}
