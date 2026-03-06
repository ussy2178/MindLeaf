import type { Node } from "reactflow";

export type Rect = { x: number; y: number; width: number; height: number };

/** ノードのレイヤーを取得 */
function getLayer(node: Node): number {
  return (node.data?.layer as number) ?? 2;
}

/** ノードタイプ・データから幅・高さを推定（レイアウトと一致） */
function getNodeSize(node: Node): { width: number; height: number } {
  const w = node.width ?? null;
  const h = node.height ?? null;
  if (typeof w === "number" && typeof h === "number" && w > 0 && h > 0) {
    return { width: w, height: h };
  }
  const type = node.type ?? "detail";
  const content = (node.data?.content as string) ?? "";
  if (type === "bookRoot") return { width: 220, height: 60 };
  if (type === "abstract") {
    return {
      width: 230,
      height: Math.max(80, 24 + (content.split("\n").length || 1) * 20),
    };
  }
  const charWidth = 8;
  const width = Math.min(260, Math.max(120, content.length * charWidth)) + 24;
  const lines = Math.min(4, Math.ceil(content.length / 40) || 1);
  const height = 24 + lines * 22;
  return { width, height };
}

/** ノードの矩形（flow 座標）とレイヤー2かどうか。Layer2 はドット中心のみ使う */
export function getNodeBounds(node: Node): { rect: Rect; isDot: boolean } {
  const { width, height } = getNodeSize(node);
  const layer = getLayer(node);
  const isDot = layer === 2;
  return {
    rect: {
      x: node.position.x,
      y: node.position.y,
      width,
      height,
    },
    isDot,
  };
}

/** Layer2 ノードのドット中心（flow 座標）。ドットはノード上部中央 w-3 h-3 */
export function getDotCenter(node: Node): { x: number; y: number } {
  const { width } = getNodeSize(node);
  return {
    x: node.position.x + width / 2,
    y: node.position.y + 6, // ドット半径 6px
  };
}

/**
 * 線分 (ax,ay)-(bx,by) と矩形 rect の境界との交点のうち、
 * (ax,ay) に最も近い点を返す。交差しなければ null。
 */
function segmentRectClosest(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  rect: Rect
): { x: number; y: number } | null {
  const { x: rx, y: ry, width: rw, height: rh } = rect;
  const left = rx;
  const right = rx + rw;
  const top = ry;
  const bottom = ry + rh;

  let best: { x: number; y: number } | null = null;

  const dx = bx - ax;
  const dy = by - ay;

  function test(px: number, py: number): void {
    const t = Math.abs(dx) > 1e-9 ? (px - ax) / dx : Math.abs(dy) > 1e-9 ? (py - ay) / dy : 0;
    if (t >= 0 && t <= 1) {
      const dist = (px - ax) * (px - ax) + (py - ay) * (py - ay);
      if (!best || dist < (best.x - ax) ** 2 + (best.y - ay) ** 2) {
        best = { x: px, y: py };
      }
    }
  }

  // 左辺 x = left
  if (Math.abs(dx) > 1e-9) {
    const t = (left - ax) / dx;
    const py = ay + t * dy;
    if (t >= 0 && t <= 1 && py >= top && py <= bottom) test(left, py);
  }
  // 右辺 x = right
  if (Math.abs(dx) > 1e-9) {
    const t = (right - ax) / dx;
    const py = ay + t * dy;
    if (t >= 0 && t <= 1 && py >= top && py <= bottom) test(right, py);
  }
  // 上辺 y = top
  if (Math.abs(dy) > 1e-9) {
    const t = (top - ay) / dy;
    const px = ax + t * dx;
    if (t >= 0 && t <= 1 && px >= left && px <= right) test(px, top);
  }
  // 下辺 y = bottom
  if (Math.abs(dy) > 1e-9) {
    const t = (bottom - ay) / dy;
    const px = ax + t * dx;
    if (t >= 0 && t <= 1 && px >= left && px <= right) test(px, bottom);
  }

  return best;
}

/**
 * 線分 (ax,ay)-(bx,by) と rect の境界の交点のうち、
 * (ax,ay) に近い方 = 線が rect から「出る」点
 */
export function getSegmentRectExit(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  rect: Rect
): { x: number; y: number } | null {
  return segmentRectClosest(ax, ay, bx, by, rect);
}

/**
 * 線分 (ax,ay)-(bx,by) と rect の境界の交点のうち、
 * (bx,by) に近い方 = 線が rect に「入る」点
 */
export function getSegmentRectEntry(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  rect: Rect
): { x: number; y: number } | null {
  const pt = segmentRectClosest(bx, by, ax, ay, rect);
  return pt;
}
