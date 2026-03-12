/**
 * HTML 文字列からタグを除去してプレーンテキストを返す。
 * マインドマップのノード表示など、リッチテキストが不要な箇所で使用する。
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  const div = typeof document !== "undefined" ? document.createElement("div") : null;
  if (!div) {
    return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  }
  div.innerHTML = html;
  const text = div.textContent ?? div.innerText ?? "";
  return text.replace(/\s+/g, " ").trim();
}

/** リッチテキスト（HTML）が実質的に空かどうかを判定する。保存前のバリデーションに使用。 */
export function isEditorContentEmpty(html: string): boolean {
  return !stripHtml(html ?? "").trim();
}
