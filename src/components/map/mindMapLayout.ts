import {
  forceSimulation,
  forceCollide,
  forceLink,
  forceManyBody,
  type SimulationNodeDatum,
} from "d3-force";
import type { Node, Edge } from "reactflow";

/** ノードを「体積を持つ箱」として扱う際の余白。衝突半径 = 外接円半径 + この値 */
const COLLIDE_PADDING = 40;
/** 重なり解消のみ：最小限の tick と弱い alpha で「ヌルッ」と動く */
const TICK_COUNT = 80;
const ALPHA_INITIAL = 0.25;
const ALPHA_DECAY = 0.08;

/** 全体再配置：本ごとクラスタリング＋クラスタ間の重なり防止 */
const FULL_LAYOUT_TICK_COUNT = 200;
const FULL_LAYOUT_ALPHA = 0.4;
const FULL_LAYOUT_ALPHA_DECAY = 0.022;
/** クラスタ内：ノード間・階層間を広めに（nodesep/ranksep 相当） */
const CLUSTER_NODE_SPACING_X = 200;
const CLUSTER_LAYER_SPACING_Y = 300;
const CLUSTER_LINK_DISTANCE = 200;
const CLUSTER_CHARGE_STRENGTH = -300;

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

/**
 * 衝突用半径：ノードを「箱」として扱い、その外接円の半径 + パディングで重なり判定。
 * 力学モデルで重なっているノードを押し出し、重ならなくなるまで反発させる。
 */
function collisionRadius(d: D3Node): number {
  const halfDiagonal =
    Math.sqrt(d.width * d.width + d.height * d.height) / 2;
  return halfDiagonal + COLLIDE_PADDING;
}

/** バウンディングボックス同士の重なりを解消する post-process（体積を持つ箱として押し出す） */
function resolveBboxOverlaps(nodes: Node[]): Node[] {
  if (nodes.length <= 1) return nodes;
  const withDims = nodes.map((n) => ({
    node: n,
    w: getNodeDimensions(n).width,
    h: getNodeDimensions(n).height,
  }));
  const ITER = 8;
  let current = withDims.map(({ node, w, h }) => ({
    x: node.position.x,
    y: node.position.y,
    w,
    h,
    node,
  }));
  for (let iter = 0; iter < ITER; iter++) {
    let moved = false;
    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const a = current[i];
        const b = current[j];
        const overlapX =
          Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const overlapY =
          Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (overlapX <= 0 || overlapY <= 0) continue;
        moved = true;
        const signX = b.x + b.w / 2 > a.x + a.w / 2 ? 1 : -1;
        const signY = b.y + b.h / 2 > a.y + a.h / 2 ? 1 : -1;
        if (overlapX <= overlapY) {
          b.x += overlapX * signX;
        } else {
          b.y += overlapY * signY;
        }
      }
    }
    if (!moved) break;
  }
  return current.map(({ node, x, y }) => ({
    ...node,
    position: { x, y },
  }));
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

  const raw = d3Nodes.map((d) => {
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
  return resolveBboxOverlaps(raw);
}

/**
 * 1つの本（クラスタ）内でレイアウト。ルートを (0,0) に固定し、エッセンス・メモを力学配置。
 * 全ノードに反発力（forceManyBody）とリンク距離（forceLink）、衝突回避（forceCollide）を適用。
 */
function runSingleClusterLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  const byLayer: Node[][] = [[], [], []];
  for (const node of nodes) {
    const layer = Math.min(2, Math.max(0, (node.data?.layer as number) ?? 2));
    byLayer[layer].push(node);
  }

  const d3Nodes: D3Node[] = [];
  const nodeById = new Map<string, D3Node>();

  for (const node of nodes) {
    const { width, height } = getNodeDimensions(node);
    const layer = (node.data?.layer as number) ?? 2;
    const isRoot = layer === 0;

    let cx: number;
    let cy: number;
    if (isRoot) {
      cx = width / 2;
      cy = height / 2;
    } else {
      const layerNodes = byLayer[layer];
      const idx = layerNodes.findIndex((n) => n.id === node.id);
      const row = Math.floor(idx / 6);
      const col = idx % 6;
      cx = width / 2 + col * CLUSTER_NODE_SPACING_X + (Math.random() * 40 - 20);
      cy =
        (byLayer[0][0] ? getNodeDimensions(byLayer[0][0]).height : 60) +
        CLUSTER_LAYER_SPACING_Y * (layer - 1) +
        row * 120 +
        (Math.random() * 30 - 15);
    }

    const d: D3Node = {
      id: node.id,
      layer: (node.data?.layer as number) ?? 2,
      width,
      height,
      rfNode: node,
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
    };
    if (d.layer === 0) {
      d.fx = cx;
      d.fy = cy;
    }
    d3Nodes.push(d);
    nodeById.set(node.id, d);
  }

  const links = edges
    .map((e) => {
      const source = nodeById.get(e.source);
      const target = nodeById.get(e.target);
      if (!source || !target) return null;
      return { source, target };
    })
    .filter((l): l is { source: D3Node; target: D3Node } => l != null);

  const simulation = forceSimulation<D3Node>(d3Nodes)
    .alpha(FULL_LAYOUT_ALPHA)
    .alphaDecay(FULL_LAYOUT_ALPHA_DECAY)
    .force(
      "link",
      forceLink<D3Node, { source: D3Node; target: D3Node }>(links)
        .id((n) => n.id)
        .distance(CLUSTER_LINK_DISTANCE)
    )
    .force("charge", forceManyBody<D3Node>().strength(CLUSTER_CHARGE_STRENGTH))
    .force(
      "collide",
      forceCollide<D3Node>().radius(collisionRadius).iterations(4)
    );

  for (let i = 0; i < FULL_LAYOUT_TICK_COUNT; i++) {
    simulation.tick();
  }
  simulation.stop();

  const raw = d3Nodes.map((d) => {
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
  return resolveBboxOverlaps(raw);
}

/** クラスタ（本）を「見えない枠」として扱う仮想ノード。力学で互いに反発させて配置 */
type ClusterVirtualNode = SimulationNodeDatum & {
  id: number;
  x: number;
  y: number;
  radius: number;
  clusterIndex: number;
};

/** クラスタ間：本という大きな塊同士が重ならないよう、反発力で配置（磁石のように距離を取る） */
const CLUSTER_FRAME_MARGIN = 120;
const CLUSTER_REPULSE_STRENGTH = -500;
const CLUSTER_PLACEMENT_TICKS = 100;

/**
 * 現在の座標を無視し、本（Book）単位でクラスタリングしてから一から並べ直す。
 * (1) 各クラスタ内だけでエッセンス・メモを配置 (2) 本を「見えない枠」の大きな塊として扱い、
 * 塊同士に強い反発力（力学レイアウト）をかけ、重ならない位置に落ち着かせる。
 */
export function getFullLayoutElements(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  const bookIdKey = (n: Node) => (n.data?.content_id as string) ?? (n.data?.book_id as string) ?? "";

  const byBook = new Map<string, Node[]>();
  for (const node of nodes) {
    const key = bookIdKey(node);
    if (!byBook.has(key)) byBook.set(key, []);
    byBook.get(key)!.push(node);
  }

  const bookIds = Array.from(byBook.keys());
  const layoutedClusters: Node[][] = [];

  for (let i = 0; i < bookIds.length; i++) {
    const clusterNodes = byBook.get(bookIds[i])!;
    const clusterNodeIds = new Set(clusterNodes.map((n) => n.id));
    const clusterEdges = edges.filter(
      (e) => clusterNodeIds.has(e.source) && clusterNodeIds.has(e.target)
    );
    const layouted = runSingleClusterLayout(clusterNodes, clusterEdges);
    layoutedClusters.push(layouted);
  }

  if (layoutedClusters.length === 0) return nodes;
  if (layoutedClusters.length === 1) return layoutedClusters[0];

  // 各クラスタのバウンディングボックス（見えない枠）を計算
  const clusterBounds: { minX: number; minY: number; maxX: number; maxY: number; centerX: number; centerY: number; radius: number }[] = [];
  for (const cluster of layoutedClusters) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of cluster) {
      const { width, height } = getNodeDimensions(n);
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + width);
      maxY = Math.max(maxY, n.position.y + height);
    }
    const w = maxX - minX;
    const h = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const radius = Math.max(w, h) / 2 + CLUSTER_FRAME_MARGIN;
    clusterBounds.push({ minX, minY, maxX, maxY, centerX, centerY, radius });
  }

  // クラスタを「大きな塊」として力学配置：互いに反発し、重ならない位置へ
  const virtualNodes: ClusterVirtualNode[] = clusterBounds.map((b, i) => ({
    id: i,
    x: b.centerX,
    y: b.centerY,
    radius: b.radius,
    clusterIndex: i,
    vx: 0,
    vy: 0,
  }));

  const clusterSim = forceSimulation<ClusterVirtualNode>(virtualNodes)
    .alpha(0.4)
    .alphaDecay(0.02)
    .force(
      "collide",
      forceCollide<ClusterVirtualNode>().radius((d) => d.radius).iterations(4)
    )
    .force("charge", forceManyBody<ClusterVirtualNode>().strength(CLUSTER_REPULSE_STRENGTH));

  for (let i = 0; i < CLUSTER_PLACEMENT_TICKS; i++) {
    clusterSim.tick();
  }
  clusterSim.stop();

  const result: Node[] = [];
  for (let i = 0; i < layoutedClusters.length; i++) {
    const cluster = layoutedClusters[i];
    const prev = clusterBounds[i];
    const next = virtualNodes[i];
    const newCenterX = next.x ?? prev.centerX;
    const newCenterY = next.y ?? prev.centerY;
    const offsetX = newCenterX - prev.centerX;
    const offsetY = newCenterY - prev.centerY;
    for (const n of cluster) {
      result.push({
        ...n,
        position: {
          x: n.position.x + offsetX,
          y: n.position.y + offsetY,
        },
      });
    }
  }
  return result;
}
