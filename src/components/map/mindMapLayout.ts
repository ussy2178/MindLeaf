import {
  forceSimulation,
  forceCollide,
  type SimulationNodeDatum,
} from "d3-force";
import type { Node, Edge } from "reactflow";

const COLLIDE_PADDING = 24;
/** 重なり解消のみ：最小限の tick と弱い alpha で「ヌルッ」と動く */
const TICK_COUNT = 80;
const ALPHA_INITIAL = 0.25;
const ALPHA_DECAY = 0.08;

type D3Node = SimulationNodeDatum & {
  id: string;
  layer: number;
  width: number;
  height: number;
  rfNode: Node;
};

/** ノードタイプ・コンテンツ長に応じた幅・高さの見積もり（衝突判定・スペース確保用） */
function getNodeDimensions(node: Node): { width: number; height: number } {
  const type = node.type ?? "detail";
  const content = (node.data?.content as string) ?? "";

  if (type === "bookRoot") {
    return { width: 220, height: 60 };
  }
  if (type === "abstract") {
    return {
      width: 230,
      height: Math.max(80, 24 + (content.split("\n").length || 1) * 20),
    };
  }
  const charWidth = 8;
  const width =
    Math.min(260, Math.max(120, content.length * charWidth)) + 24;
  const lines = Math.min(4, Math.ceil(content.length / 40) || 1);
  const height = 24 + lines * 22;
  return { width, height };
}

/** 衝突用半径（対角線の半分 + パディング）。テキストが長いノードは広めに確保 */
function collisionRadius(d: D3Node): number {
  const halfDiagonal =
    Math.sqrt(d.width * d.width + d.height * d.height) / 2;
  return halfDiagonal + COLLIDE_PADDING;
}

/**
 * 現在の位置を維持しつつ、重なりだけを解消するレイアウト。
 * 各ノードの初期座標は画面上（DB）の現在位置から開始し、
 * forceCollide のみで衝突を解消。リンク・電荷は使わない。
 */
export function getLayoutedElements(nodes: Node[], edges: Edge[]): Node[] {
  void edges; // 呼び出し側 API 互換のため受け取るが、本レイアウトでは未使用
  if (nodes.length === 0) return nodes;

  const d3Nodes: D3Node[] = nodes.map((node) => {
    const { width, height } = getNodeDimensions(node);
    const layer = (node.data?.layer as number) ?? 2;
    const isRoot = layer === 0;
    const pos = node.position ?? { x: 0, y: 0 };
    // 現在の position（左上）から中心座標を算出
    const cx = pos.x + width / 2;
    const cy = pos.y + height / 2;
    const d: D3Node = {
      id: node.id,
      layer,
      width,
      height,
      rfNode: node,
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
    };
    // ルートは現在位置に固定（動かさない）
    if (isRoot) {
      d.fx = cx;
      d.fy = cy;
    }
    return d;
  });

  const simulation = forceSimulation<D3Node>(d3Nodes)
    .alpha(ALPHA_INITIAL)
    .alphaDecay(ALPHA_DECAY)
    .force(
      "collide",
      forceCollide<D3Node>().radius(collisionRadius).iterations(4)
    );

  for (let i = 0; i < TICK_COUNT; i++) {
    simulation.tick();
  }
  simulation.stop();

  return d3Nodes.map((d) => {
    const { width, height, rfNode } = d;
    const cx = d.x ?? 0;
    const cy = d.y ?? 0;
    return {
      ...rfNode,
      position: {
        x: cx - width / 2,
        y: cy - height / 2,
      },
    };
  });
}
