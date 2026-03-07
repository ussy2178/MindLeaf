/**
 * 設計ドキュメント（Supabase SQL）に基づく型定義
 */

// --- Books テーブル ---
export interface Book {
  id: string;
  title: string;
  author: string | null;
  cover_image_url: string | null;
  position_x: number;
  position_y: number;
  created_at: string;
}

/** 本を登録するときの入力（id, created_at はDBで生成。position_x/y は省略時DBデフォルト） */
export type BookInsert = Omit<Book, "id" | "created_at" | "position_x" | "position_y"> & {
  title: string;
  author?: string | null;
  cover_image_url?: string | null;
  position_x?: number;
  position_y?: number;
};

// --- Nodes テーブル（思考の単位） ---
export type NodeType = "book_root" | "quote" | "thought";

export interface Node {
  id: string;
  book_id: string | null;
  type: NodeType;
  layer: number;
  content: string;
  interpretation: string | null;
  position_x: number;
  position_y: number;
  created_at: string;
}

/** ノード登録時（本登録時に book_root を自動作成するなど） */
export type NodeInsert = Omit<Node, "id" | "created_at"> & {
  book_id?: string | null;
  type: NodeType;
  layer?: number;
  content: string;
  interpretation?: string | null;
  position_x?: number;
  position_y?: number;
};

// --- Edges テーブル（繋がり） ---
export interface Edge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  created_at: string;
}

export type EdgeInsert = Omit<Edge, "id" | "created_at">;
