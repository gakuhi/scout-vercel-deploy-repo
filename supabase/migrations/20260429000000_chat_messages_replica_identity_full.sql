-- =============================================================
-- chat_messages: REPLICA IDENTITY FULL
--
-- Realtime の postgres_changes は購読時にフィルタ列が WAL に乗っているかを
-- 事前検証する。REPLICA IDENTITY DEFAULT (PK のみ) のままだと、PR #112 の
-- 学生チャット画面が使う `scout_id=in.(...)` フィルタが
-- "invalid column for filter scout_id" で弾かれ購読自体が失敗する。
-- 全列を WAL に流して scout_id フィルタを成立させる。
-- =============================================================

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
