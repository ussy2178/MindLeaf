/**
 * Supabase / DB スキーマに基づく型定義（design_doc 準拠）
 * position_x, position_y は nodes / books のマップ座標用
 */
export type {
  Book,
  BookInsert,
  Node,
  NodeInsert,
  NodeType,
  Edge,
  EdgeInsert,
} from "@/lib/types";
