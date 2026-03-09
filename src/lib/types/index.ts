/**
 * 設計ドキュメント v1.5.0（Supabase SQL）に基づく型定義
 */

// --- Contents テーブル（旧 Books） ---
export type ContentType = "Book" | "Movie" | "Anime" | "Drama";
export type ContentStatus = "Unseen" | "Now" | "Seen";

export interface Content {
  id: string;
  title: string;
  author: string | null;
  content_type: ContentType | null;
  status: ContentStatus | null;
  seen_on: string | null;
  rating: number | null;
  overall_review: string | null;
  is_on_map: boolean;
  cover_image_url: string | null;
  position_x: number;
  position_y: number;
  created_at: string;
}

export type ContentInsert = Omit<Content, "id" | "created_at" | "position_x" | "position_y"> & {
  title: string;
  author?: string | null;
  content_type?: ContentType | null;
  status?: ContentStatus | null;
  seen_on?: string | null;
  rating?: number | null;
  overall_review?: string | null;
  is_on_map?: boolean;
  cover_image_url?: string | null;
  position_x?: number;
  position_y?: number;
};

/** @deprecated Use Content instead */
export type Book = Content;
/** @deprecated Use ContentInsert instead */
export type BookInsert = ContentInsert;

// --- Nodes テーブル（思考の単位） ---
export type NodeType = "book_root" | "quote" | "thought";

export interface Node {
  id: string;
  content_id: string | null;
  type: NodeType;
  layer: number;
  content: string;
  interpretation: string | null;
  position_x: number;
  position_y: number;
  created_at: string;
}

export type NodeInsert = Omit<Node, "id" | "created_at"> & {
  content_id?: string | null;
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
