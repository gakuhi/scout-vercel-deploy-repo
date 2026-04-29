-- company_notification_settings に event_reminder カラムを追加
-- migration リネームで version が変わったため、旧 version で既に適用済みの
-- preview DB との冪等性を保つため IF NOT EXISTS を付ける
ALTER TABLE company_notification_settings
  ADD COLUMN IF NOT EXISTS event_reminder BOOLEAN DEFAULT true;
