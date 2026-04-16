-- =============================================================
-- マイグレーションの設計書（schema.md）との整合性修正
-- =============================================================

-- =============================================================
-- 1. Enum 修正
-- =============================================================

-- 1-1. user_role: company_admin を追加
ALTER TYPE user_role ADD VALUE 'company_admin' AFTER 'company_owner';

-- 1-2. scout_status: read を追加
ALTER TYPE scout_status ADD VALUE 'read' AFTER 'sent';

-- 1-3. product_source: 初期スキーマで既にリネーム済みのため不要（削除済み）

-- 1-4. academic_type: 初期スキーマの6値をそのまま維持（削除不要）

-- 1-5. 新規 Enum: company_member_role
CREATE TYPE company_member_role AS ENUM ('owner', 'admin', 'member');

-- =============================================================
-- 2. テーブル・カラム修正
-- =============================================================

-- 2-1. companies: is_public カラムを削除（設計書にない）
-- is_public に依存する RLS ポリシーを先に削除し、is_verified ベースで再作成する
DROP POLICY IF EXISTS companies_select_student ON companies;
DROP POLICY IF EXISTS job_postings_select_student ON job_postings;
DROP POLICY IF EXISTS events_select_student ON events;

ALTER TABLE companies DROP COLUMN IF EXISTS is_public;

-- is_verified ベースでポリシーを再作成
CREATE POLICY companies_select_student ON companies
  FOR SELECT USING (
    get_user_role() = 'student' AND is_verified = true
  );

CREATE POLICY job_postings_select_student ON job_postings
  FOR SELECT USING (
    get_user_role() = 'student'
    AND is_published = true
    AND EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = job_postings.company_id
      AND companies.is_verified = true
    )
  );

CREATE POLICY events_select_student ON events
  FOR SELECT USING (
    get_user_role() = 'student'
    AND is_published = true
    AND (
      organizer_type = 'platform'
      OR EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = events.company_id
        AND companies.is_verified = true
      )
    )
  );

-- 2-2. company_members: role カラムを追加
ALTER TABLE company_members
  ADD COLUMN role company_member_role DEFAULT 'member';

-- 2-3. company_notification_settings: email_enabled → line_enabled にリネーム
ALTER TABLE company_notification_settings
  RENAME COLUMN email_enabled TO line_enabled;

-- 2-4. notifications: email_sent_at カラムを削除（設計書にない）
ALTER TABLE notifications DROP COLUMN IF EXISTS email_sent_at;

-- synced_smartes_users: 既存の (email) インデックスを LOWER(email) に修正
DROP INDEX IF EXISTS idx_synced_smartes_users_email;
CREATE INDEX idx_synced_smartes_users_email ON synced_smartes_users (LOWER(email));
