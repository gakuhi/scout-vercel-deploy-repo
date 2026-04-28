-- =============================================================
-- student_notification_settings.line_enabled カラムを削除する。
--
-- 背景:
--   学生向け通知設定の "LINE 通知" チャネル ON/OFF (line_enabled) は、
--   タイプ別トグル (scout_received / chat_message / event_reminder /
--   system_announcement) を全 OFF にすれば同等の効果になり、UI 上の
--   メンタルモデルが二重になるため削除する。
--
--   配信ロジック (deliver.ts) はタイプ別トグルのみで LINE 配信を
--   ゲートするように変更する。
--
-- 補足: company_notification_settings.line_enabled は本マイグレーションの
--   対象外 (企業側 UI では引き続き使用)。
-- =============================================================

ALTER TABLE student_notification_settings
  DROP COLUMN IF EXISTS line_enabled;
