読書・映画・アニメ・ドラマと思考の可視化アプリ：設計図 (v1.5.0)

1. アプリの概要
読書や映画鑑賞で得た表現や解釈を記録し、作品の境界を越えて知識をマインドマップ形式で繋ぎ合わせる、統合型ナレッジグラフ・アプリ。

2. 技術スタック
Frontend: Next.js (App Router), Tailwind CSS, shadcn/ui
Editor: TipTap (Rich Text / Slash Commands) -- 「自分の考え」「全体感想」に使用
Backend/DB: Supabase
Visualisation: React Flow
Language: TypeScript

3. データベース設計 (Updated)

### 1. Contentsテーブル (作品・コンテンツ管理)
- `books` から名称変更。多種多様なコンテンツと視聴状況を管理。
```sql
create table contents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  title text not null,
  author text, -- 映画なら監督、本なら著者
  content_type text check (content_type in ('Book', 'Movie', 'Anime', 'Drama')),
  status text check (status in ('Unseen', 'Now', 'Seen')),
  seen_on date, -- 視聴・読了日
  rating integer, -- 2:★★, 3:★★★, 4:★★★★+
  overall_review text, -- 作品全体の感想 (Rich Text / マップ外)
  is_on_map boolean default true, -- マップに表示するかどうか
  cover_image_url text,
  position_x float8 default 0,
  position_y float8 default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
2. Nodesテーブル (思考の単位)
content カラムは Notion ライクなリッチテキストに対応。
SQL
create table nodes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  content_id uuid references contents(id) on delete cascade,
  type text check (type in ('book_root', 'quote', 'thought')),
  layer integer default 2,
  content text not null, -- TipTap によるリッチテキスト保存
  position_x float8 default 0,
  position_y float8 default 0,
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

Phase 3: コンテンツ管理 & エディタ強化

コンテンツ統合管理: Book, Movie, Anime, Drama を同一の仕組みで管理。ステータス（Unseen/Now/Seen）や日付（seen_on）、評価（星の数）を記録。

リッチテキストエディタ: 「自分の考え」および「作品全体の感想」入力欄に TipTap を導入。

「・」入力で箇条書きへ変換。

「/」入力でスラッシュコマンド起動（見出し、トグル見出しの選択）。

マップ表示フィルタ: is_on_map カラムにより、完了した作品のみ、あるいは重要な作品のみをマインドマップに展開する制御が可能。

Phase 4: ユーザー認証 (予定)

Supabase Auth によるメールアドレスログインの実装。