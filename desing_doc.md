読書と思考の可視化アプリ：設計図
1. アプリの概要
読書で得た印象的な表現や、自分なりの解釈を記録し、それらをマインドマップ形式で繋ぎ合わせることで、知識の繋がりを可視化するWebアプリ。

2. 技術スタック
Frontend: Next.js (App Router), Tailwind CSS, shadcn/ui

Backend/DB: Supabase

Visualisation: React Flow

Language: TypeScript

3. データベース設計 (Supabase SQL)
以下のSQLをSupabaseのSQL Editorで実行してテーブルを作成する。

SQL
-- 1. Booksテーブル
create table books (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  author text,
  cover_image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Nodesテーブル (思考の単位)
create table nodes (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references books(id) on delete cascade,
  type text check (type in ('book_root', 'quote', 'thought')),
  layer integer default 2, -- 1: 抽象的なまとまり, 2: 具体的引用/解釈
  content text not null,
  position_x float default 0,
  position_y float default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Edgesテーブル (繋がり)
create table edges (
  id uuid default gen_random_uuid() primary key,
  source_node_id uuid references nodes(id) on delete cascade,
  target_node_id uuid references nodes(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
4. 主要な機能要件
Phase 1: データ管理機能
本を登録する: タイトル、著者、書影（任意）を入力。登録時、自動的にその本を代表する type: 'book_root' のノードを作成する。

思考を記録する: 特定の本に紐づけて、「引用」か「自分の解釈」を選択してテキストを入力。

レイヤー管理: 入力時に「抽象的なまとめ（Layer 1）」か「具体的な断片（Layer 2）」かを選択可能にする。

Phase 2: マインドマップ表示 (React Flow)
キャンバス表示: 登録されたノードをキャンバス上に配置。

ドラッグ＆ドロップ: ノードの位置を自由に動かせ、その座標をDB（position_x, position_y）に保存する。

エッジ接続: ノードとノードを線で繋ぎ、その関係性を edges テーブルに保存する。

フィルタリング: 本ごとの表示切り替えや、Layer 1のみの表示といった制御。

5. 推奨ディレクトリ構成
Plaintext
/src
  /app
    /books        # 本の登録・一覧画面
    /map          # マインドマップ表示画面
  /components
    /ui           # shadcn/uiコンポーネント
    /map          # React Flow関連のカスタムノード等
  /lib
    /supabase     # Supabaseクライアント設定
    /types        # TypeScriptの型定義