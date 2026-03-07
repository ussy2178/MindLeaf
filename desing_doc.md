読書と思考の可視化アプリ：設計図 (v1.2.0)

1. アプリの概要
読書で得た表現や解釈を記録し、本と本の境界を越えて知識をマインドマップ形式で繋ぎ合わせる、統合型ナレッジグラフ・アプリ。

2. 技術スタック
Frontend: Next.js (App Router), Tailwind CSS, shadcn/ui
Backend/DB: Supabase
Visualisation: React Flow
Language: TypeScript

3. データベース設計 (Updated)

### 1. Booksテーブル (本の基本情報とマップ上の位置)
```sql
create table books (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  author text,
  cover_image_url text,
  position_x float8 default 0, -- 追加：全体マップ上での本の中心座標
  position_y float8 default 0, -- 追加：全体マップ上での本の中心座標
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
2. Nodesテーブル (思考の単位)
SQL
create table nodes (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references books(id) on delete cascade,
  type text check (type in ('book_root', 'quote', 'thought')),
  layer integer default 2, -- 1: エッセンス, 2: 気づき・メモ
  content text not null,
  position_x float8 default 0, -- マップ上のX座標
  position_y float8 default 0, -- マップ上のY座標
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
3. Edgesテーブル (本を跨ぐ繋がり)
SQL
create table edges (
  id uuid default gen_random_uuid() primary key,
  source_node_id uuid references nodes(id) on delete cascade,
  target_node_id uuid references nodes(id) on delete cascade,
  -- book_id は削除、または任意(nullable)とし、本を跨いだ接続を可能にする
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
主要な機能要件

Phase 1: データ管理機能

本の登録と自動ルートノード作成

思考の記録（エッセンス/気づき・メモ）

表記の最適化（Layer 1: 本の核心、Layer 2: 気づき・メモ）

Phase 2: 統合型マインドマップ (React Flow)

座標の永続化: ドラッグ終了時に position_x/y をDBに保存。次回表示時に位置を復元。

グローバルビュー: すべての本とノードを一つのキャンバスに表示。

クロスブック・コネクト: 異なる本に属するノード同士を手動で接続。

フォーカス機能: シングルクリックで親・子・兄弟ノードおよびルート（本）をハイライト。