-- =============================================================
-- Scout Service: Realtime Configuration
-- chat_messages の INSERT イベントをリアルタイム配信
-- =============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
