-- 既存の nodes テーブルに interpretation カラムを追加するマイグレーション
-- Supabase SQL Editor で実行してください（schema.sql で既にテーブルを作成済みの場合）

alter table nodes add column if not exists interpretation text;
