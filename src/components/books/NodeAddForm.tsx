"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createNode, searchBooks, getNodesByBookId } from "@/app/books/actions";
import { Link2, ChevronDown, ChevronUp, BookOpen } from "lucide-react";

type FormState = { error?: string } | { success?: boolean } | null;

export type ParentNodeOption = {
  id: string;
  layer: number;
  content: string;
  /** グローバルビューなど複数本のノードを表示する場合の本タイトル（検索・表示用） */
  bookTitle?: string;
};

type OtherBookSelection = {
  bookId: string;
  bookTitle: string;
  nodeId: string;
  content: string;
  layer: number;
};

export function NodeAddForm({
  bookId,
  nodes = [],
}: {
  bookId: string;
  nodes?: ParentNodeOption[];
}) {
  const router = useRouter();
  const [layer, setLayer] = useState<1 | 2>(2);
  const [interpretationExpanded, setInterpretationExpanded] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [parentSearch, setParentSearch] = useState("");
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    createNode,
    null
  );

  // 別の本と接続する（折りたたみ）
  const [otherBookOpen, setOtherBookOpen] = useState(false);
  const [bookQuery, setBookQuery] = useState("");
  const [bookSearchResults, setBookSearchResults] = useState<{ id: string; title: string }[]>([]);
  const [bookSearching, setBookSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState<{ id: string; title: string } | null>(null);
  const [otherBookNodes, setOtherBookNodes] = useState<ParentNodeOption[]>([]);
  const [otherBookNodesLoading, setOtherBookNodesLoading] = useState(false);
  const [selectedOtherParent, setSelectedOtherParent] = useState<OtherBookSelection | null>(null);
  const [otherBookNodeSearch, setOtherBookNodeSearch] = useState("");

  useEffect(() => {
    if (state && "success" in state && state.success) {
      setShowSuccessMessage(true);
      router.refresh();
      const t = setTimeout(() => setShowSuccessMessage(false), 3000);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  const isLayer1 = layer === 1;

  const bookRootNode = useMemo(
    () => nodes.find((n) => n.layer === 0),
    [nodes]
  );
  const parentOptions = useMemo(
    () => nodes.filter((n) => n.layer === 0 || n.layer === 1),
    [nodes]
  );

  const filteredParentOptions = useMemo(() => {
    if (parentOptions.length <= 10 && !parentSearch.trim()) return parentOptions;
    const q = parentSearch.trim().toLowerCase();
    if (!q) return parentOptions;
    return parentOptions.filter((n) => {
      const content = (n.content ?? "").toLowerCase();
      const bookTitle = (n.bookTitle ?? "").toLowerCase();
      return content.includes(q) || bookTitle.includes(q);
    });
  }, [parentOptions, parentSearch]);
  const showParentSearch = parentOptions.length > 10;

  /** 別の本のノード一覧を内容でフィルタ（リストが長いとき用） */
  const filteredOtherBookNodes = useMemo(() => {
    if (otherBookNodes.length <= 10 && !otherBookNodeSearch.trim()) return otherBookNodes;
    const q = otherBookNodeSearch.trim().toLowerCase();
    if (!q) return otherBookNodes;
    return otherBookNodes.filter((n) => (n.content ?? "").toLowerCase().includes(q));
  }, [otherBookNodes, otherBookNodeSearch]);
  const showOtherBookNodeSearch = otherBookNodes.length > 10;

  // 本検索（デバウンス付き）
  const runBookSearch = useCallback(async () => {
    const q = bookQuery.trim();
    if (!q) {
      setBookSearchResults([]);
      return;
    }
    setBookSearching(true);
    const result = await searchBooks(q);
    setBookSearching(false);
    if (result && "books" in result) setBookSearchResults(result.books);
    if (result && "error" in result) setBookSearchResults([]);
  }, [bookQuery]);

  useEffect(() => {
    if (!bookQuery.trim()) {
      setBookSearchResults([]);
      return;
    }
    const t = setTimeout(runBookSearch, 300);
    return () => clearTimeout(t);
  }, [bookQuery, runBookSearch]);

  // 本選択時にノード取得（フィルタもリセット）
  useEffect(() => {
    if (!selectedBook) {
      setOtherBookNodes([]);
      setSelectedOtherParent(null);
      setOtherBookNodeSearch("");
      return;
    }
    setOtherBookNodeSearch("");
    setOtherBookNodesLoading(true);
    getNodesByBookId(selectedBook.id).then((res) => {
      setOtherBookNodesLoading(false);
      if (res && "nodes" in res)
        setOtherBookNodes(
          res.nodes.map((n) => ({
            ...n,
            bookTitle: selectedBook.title,
          }))
        );
      else setOtherBookNodes([]);
      setSelectedOtherParent(null);
    });
  }, [selectedBook]);

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white shadow-md border border-stone-200 p-6 sm:p-8 space-y-6"
    >
      <input type="hidden" name="bookId" value={bookId} readOnly aria-hidden />
      {isLayer1 && (
        <input type="hidden" name="type" value="thought" readOnly aria-hidden />
      )}
      {isLayer1 && bookRootNode && (
        <input type="hidden" name="parentId" value={bookRootNode.id} readOnly aria-hidden />
      )}

      {/* 階層選択 */}
      <div role="group" aria-label="階層">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="layer"
              value="1"
              checked={layer === 1}
              onChange={() => {
                setLayer(1);
                setInterpretationExpanded(false);
                setSelectedOtherParent(null);
                setOtherBookOpen(false);
              }}
              className="rounded border-stone-300 text-primary-600 focus:ring-primary/30 focus:ring-4"
            />
            <span>1: エッセンス（本の核心）</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="layer"
              value="2"
              checked={layer === 2}
              onChange={() => setLayer(2)}
              className="rounded border-stone-300 text-primary-600 focus:ring-primary/30 focus:ring-4"
            />
            <span>2: 気づき・メモ</span>
          </label>
        </div>
      </div>

      {/* 接続先の親ノード（気づき・メモのみ） */}
      {!isLayer1 && (parentOptions.length > 0 || otherBookOpen) && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-stone-700">
            接続先の親ノード
          </label>

          {/* 同一本内の親ノード（常に表示・必須） */}
          {parentOptions.length > 0 && (
            <>
              <p className="text-xs text-stone-500">同一本内の接続先（階層の親）</p>
              {showParentSearch && (
                <input
                  type="search"
                  value={parentSearch}
                  onChange={(e) => setParentSearch(e.target.value)}
                  placeholder="検索（内容・本タイトル）"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 mb-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  aria-label="親ノードを検索"
                />
              )}
              <select
                id="parentId"
                name="parentId"
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-shadow"
              >
                {filteredParentOptions.length === 0 ? (
                  <option value="">
                    {parentSearch.trim() ? "該当するノードがありません" : "選択してください"}
                  </option>
                ) : (
                  filteredParentOptions.map((n) => {
                    const text =
                      n.content.length > 40 ? `${n.content.slice(0, 40)}…` : n.content;
                    const prefix = n.bookTitle ? `[${n.bookTitle}] ` : "";
                    const label =
                      n.layer === 0
                        ? `${prefix}本のタイトル：${text}`
                        : `${prefix}エッセンス（核心）：${text}`;
                    return (
                      <option key={n.id} value={n.id}>
                        {label}
                      </option>
                    );
                  })
                )}
              </select>
            </>
          )}

          {/* 別の本のノードを追加で選択している場合のプレビュー */}
          {selectedOtherParent && (
            <div
              className="rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-4 flex flex-col gap-2"
              role="status"
              aria-live="polite"
            >
              <p className="text-xs font-medium text-indigo-700 uppercase tracking-wider">
                追加で接続（別の本）
              </p>
              <p className="text-stone-800 font-medium flex items-center gap-2">
                <BookOpen className="size-4 text-indigo-600 shrink-0" aria-hidden />
                {selectedOtherParent.bookTitle}
              </p>
              <p className="text-sm text-stone-600 truncate">
                {selectedOtherParent.layer === 0
                  ? "本のタイトル"
                  : selectedOtherParent.layer === 1
                    ? "エッセンス（核心）"
                    : "気づき・メモ"}
                ：{selectedOtherParent.content.length > 50 ? `${selectedOtherParent.content.slice(0, 50)}…` : selectedOtherParent.content}
              </p>
              <input type="hidden" name="otherBookParentNodeId" value={selectedOtherParent.nodeId} readOnly />
              <button
                type="button"
                onClick={() => setSelectedOtherParent(null)}
                className="text-xs text-indigo-600 hover:text-indigo-800 underline self-start"
              >
                この接続を外す
              </button>
            </div>
          )}

          {/* 別の本と接続する（アコーディオン） */}
          {
            <div className="border border-stone-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOtherBookOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 transition-colors"
                aria-expanded={otherBookOpen}
              >
                <span className="flex items-center gap-2">
                  <Link2 className="size-4 text-stone-500" aria-hidden />
                  別の本と接続する
                </span>
                {otherBookOpen ? (
                  <ChevronUp className="size-4 text-stone-500" aria-hidden />
                ) : (
                  <ChevronDown className="size-4 text-stone-500" aria-hidden />
                )}
              </button>
              {otherBookOpen && (
                <div className="p-4 pt-0 space-y-4 border-t border-stone-200 bg-white">
                  {/* ステップ1: 本を探す */}
                  <div>
                    <label
                      htmlFor="other-book-search"
                      className="block text-xs font-medium text-stone-500 mb-1"
                    >
                      ステップ1: 本を探す
                    </label>
                    <input
                      id="other-book-search"
                      type="search"
                      value={bookQuery}
                      onChange={(e) => setBookQuery(e.target.value)}
                      placeholder="本のタイトルで検索"
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      aria-label="本のタイトルで検索"
                    />
                    {bookSearching && (
                      <p className="text-xs text-stone-400 mt-1">検索中…</p>
                    )}
                    {bookQuery.trim() && !bookSearching && bookSearchResults.length === 0 && (
                      <p className="text-xs text-stone-500 mt-1">該当する本がありません</p>
                    )}
                    {bookSearchResults.length > 0 && (
                      <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto" role="listbox">
                        {bookSearchResults.map((b) => (
                          <li key={b.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBook(
                                  selectedBook?.id === b.id ? null : { id: b.id, title: b.title }
                                );
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                selectedBook?.id === b.id
                                  ? "bg-primary/10 text-primary-800 border border-primary/30"
                                  : "hover:bg-stone-100 text-stone-800"
                              }`}
                              role="option"
                              aria-selected={selectedBook?.id === b.id}
                            >
                              {b.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* ステップ2: ノードを選ぶ（エッセンス・気づき・メモ） */}
                  {selectedBook && (
                    <div>
                      <label
                        htmlFor="other-book-node"
                        className="block text-xs font-medium text-stone-500 mb-1"
                      >
                        ステップ2: ノードを選ぶ（{selectedBook.title}）
                      </label>
                      {otherBookNodesLoading ? (
                        <p className="text-sm text-stone-500 py-2">読み込み中…</p>
                      ) : (
                        <>
                          {showOtherBookNodeSearch && (
                            <input
                              type="search"
                              value={otherBookNodeSearch}
                              onChange={(e) => setOtherBookNodeSearch(e.target.value)}
                              placeholder="ノード名で絞り込み"
                              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 mb-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary/20"
                              aria-label="ノードを検索"
                            />
                          )}
                          <select
                            id="other-book-node"
                            value={selectedOtherParent?.nodeId ?? ""}
                            onChange={(e) => {
                              const nodeId = e.target.value;
                              if (!nodeId) {
                                setSelectedOtherParent(null);
                                return;
                              }
                              const n = otherBookNodes.find((x) => x.id === nodeId);
                              if (n)
                                setSelectedOtherParent({
                                  bookId: selectedBook.id,
                                  bookTitle: selectedBook.title,
                                  nodeId: n.id,
                                  content: n.content,
                                  layer: n.layer,
                                });
                            }}
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">
                              {filteredOtherBookNodes.length === 0 && otherBookNodeSearch.trim()
                                ? "該当するノードがありません"
                                : "選択してください"}
                            </option>
                            {filteredOtherBookNodes.map((n) => {
                              const text =
                                n.content.length > 40 ? `${n.content.slice(0, 40)}…` : n.content;
                              const badge =
                                n.layer === 0
                                  ? "本のタイトル"
                                  : n.layer === 1
                                    ? "[エッセンス]"
                                    : "[メモ]";
                              const label =
                                n.layer === 0 ? `${badge}：${text}` : `${badge} ${text}`;
                              return (
                                <option key={n.id} value={n.id}>
                                  {label}
                                </option>
                              );
                            })}
                          </select>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          }
        </div>
      )}

      {/* 種類（レイヤー2のみ） */}
      {!isLayer1 && (
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">種類</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="quote"
                defaultChecked
                className="rounded border-stone-300 text-primary-600 focus:ring-primary/30 focus:ring-4"
              />
              <span>引用</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="thought"
                className="rounded border-stone-300 text-primary-600 focus:ring-primary/30 focus:ring-4"
              />
              <span>自分の解釈</span>
            </label>
          </div>
        </div>
      )}

      {/* 内容 */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-stone-700 mb-1">
          内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={6}
          placeholder={
            isLayer1
              ? "この章で一番伝えたかったことは？"
              : "今、心に残った言葉は何ですか？"
          }
          className="w-full min-h-[120px] resize-y rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] leading-relaxed shadow-sm focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-shadow"
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
            <div style={{ gridTemplateRows: "1fr" }} className="grid transition-[grid-template-rows] duration-200 ease-out">
              <div className="min-h-0">
                <label htmlFor="interpretation" className="block text-sm font-medium text-stone-700 mb-1">
                  自分の考え・思い・感じたこと
                </label>
                <textarea
                  id="interpretation"
                  name="interpretation"
                  rows={8}
                  placeholder="読んで感じたこと・思ったことを自由に書いてください（任意）"
                  className="w-full min-h-[200px] max-h-[480px] resize-y overflow-y-auto rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] leading-relaxed shadow-sm focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-shadow"
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateRows: "1fr" }} className="overflow-hidden transition-all duration-200 ease-out">
          <div className="min-w-0">
            <label htmlFor="interpretation-layer2" className="block text-sm font-medium text-stone-700 mb-1">
              自分の考え・思い・感じたこと
            </label>
            <textarea
              id="interpretation-layer2"
              name="interpretation"
              rows={8}
              placeholder="読んで感じたこと・思ったことを自由に書いてください（任意）"
              className="w-full min-h-[200px] max-h-[480px] resize-y overflow-y-auto rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] leading-relaxed shadow-sm focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-shadow"
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
        disabled={
          !!isPending ||
          (showParentSearch && filteredParentOptions.length === 0)
        }
        className="px-5 py-3 bg-primary text-white rounded-xl shadow-sm hover:bg-primary-600 disabled:opacity-50 transition-opacity"
      >
        {isPending ? "追加中..." : "追加する"}
      </button>
    </form>
  );
}
