-- アプリ内通知は全種別常時 ON となったため in_app_enabled カラムを廃止する
ALTER TABLE company_notification_settings
  DROP COLUMN IF EXISTS in_app_enabled;
