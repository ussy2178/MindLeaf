-- MindLeaf: 設計ドキュメントに基づくテーブル定義
-- Supabase SQL Editor で実行してください

-- 1. Booksテーブル
create table if not exists books (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  author text,
  cover_image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Nodesテーブル (思考の単位)
create table if not exists nodes (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references books(id) on delete cascade,
  type text check (type in ('book_root', 'quote', 'thought')),
  layer integer default 2,
  content text not null,
  interpretation text,
  position_x float default 0,
  position_y float default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 既存の nodes テーブルに interpretation を追加する場合（既にテーブルがある環境用）
-- alter table nodes add column if not exists interpretation text;

-- 3. Edgesテーブル (繋がり)
create table if not exists edges (
  id uuid default gen_random_uuid() primary key,
  source_node_id uuid references nodes(id) on delete cascade,
  target_node_id uuid references nodes(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
