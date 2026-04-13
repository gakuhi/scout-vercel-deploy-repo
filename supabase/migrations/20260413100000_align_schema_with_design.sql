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

-- 1-3. product_source: 値をリネーム（smart_es→smartes 等）
ALTER TYPE product_source RENAME VALUE 'smart_es' TO 'smartes';
ALTER TYPE product_source RENAME VALUE 'company_ai' TO 'compai';
ALTER TYPE product_source RENAME VALUE 'interview_ai' TO 'interviewai';
ALTER TYPE product_source RENAME VALUE 'syukatsu' TO 'sugoshu';

-- 1-4. academic_type: 6値→3値（arts, medical, sports を削除）
-- PostgreSQL は ALTER TYPE ... DROP VALUE をサポートしないため、型を再作成する
ALTER TYPE academic_type RENAME TO academic_type_old;

CREATE TYPE academic_type AS ENUM ('liberal_arts', 'science', 'other');

ALTER TABLE students
  ALTER COLUMN academic_type TYPE academic_type
  USING academic_type::text::academic_type;

DROP TYPE academic_type_old;

-- 1-5. 新規 Enum: company_member_role
CREATE TYPE company_member_role AS ENUM ('owner', 'admin', 'member');

-- =============================================================
-- 2. テーブル・カラム修正
-- =============================================================

-- 2-1. companies: is_public カラムを削除（設計書にない）
ALTER TABLE companies DROP COLUMN IF EXISTS is_public;

-- 2-2. company_members: role カラムを追加
ALTER TABLE company_members
  ADD COLUMN role company_member_role DEFAULT 'member';

-- 2-3. company_notification_settings: email_enabled → line_enabled にリネーム
ALTER TABLE company_notification_settings
  RENAME COLUMN email_enabled TO line_enabled;

-- 2-4. notifications: email_sent_at カラムを削除（設計書にない）
ALTER TABLE notifications DROP COLUMN IF EXISTS email_sent_at;

-- =============================================================
-- 3. 汎用 synced テーブルを削除（設計書はプロダクト別テーブル）
-- =============================================================

-- インデックスはテーブル削除時に自動で削除される
DROP TABLE IF EXISTS synced_es_entries;
DROP TABLE IF EXISTS synced_researches;
DROP TABLE IF EXISTS synced_interview_sessions;
DROP TABLE IF EXISTS synced_activities;

-- =============================================================
-- 4. プロダクト別 synced テーブルを作成
-- =============================================================

-- ----- 面接練習AI（interviewai） -----

CREATE TABLE synced_interviewai_users (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id    TEXT        NOT NULL UNIQUE,
  email               TEXT        NOT NULL,
  original_created_at TIMESTAMPTZ,
  synced_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE synced_interviewai_sessions (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id       TEXT        NOT NULL,
  external_session_id    TEXT        NOT NULL,
  company_name           TEXT,
  session_type           TEXT,
  industry               TEXT,
  phase                  TEXT,
  status                 TEXT,
  overall_score          INT,
  skill_scores           JSONB,
  strengths              JSONB,
  areas_for_improvement  JSONB,
  growth_hint            TEXT,
  conversation_text      JSONB,
  started_at             TIMESTAMPTZ,
  original_created_at    TIMESTAMPTZ,
  synced_at              TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE synced_interviewai_searches (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id    TEXT        NOT NULL,
  external_search_id  TEXT        NOT NULL,
  company_name        TEXT,
  searched_at         TIMESTAMPTZ,
  synced_at           TIMESTAMPTZ DEFAULT now()
);

-- ----- 企業分析AI（compai） -----

CREATE TABLE synced_compai_users (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id    TEXT        NOT NULL UNIQUE,
  email               TEXT        NOT NULL,
  original_created_at TIMESTAMPTZ,
  synced_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE synced_compai_researches (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id      TEXT        NOT NULL,
  external_research_id  TEXT        NOT NULL,
  title                 TEXT,
  url                   TEXT,
  content               TEXT,
  raw_content           TEXT,
  citations             JSONB,
  is_bookmarked         BOOLEAN,
  status                TEXT,
  original_created_at   TIMESTAMPTZ,
  synced_at             TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE synced_compai_messages (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id      TEXT        NOT NULL,
  external_message_id   TEXT        NOT NULL,
  external_research_id  TEXT        NOT NULL,
  content               TEXT,
  sender_type           TEXT,
  original_created_at   TIMESTAMPTZ,
  synced_at             TIMESTAMPTZ DEFAULT now()
);

-- ----- すごい就活（sugoshu） -----

CREATE TABLE synced_sugoshu_users (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id    TEXT        NOT NULL UNIQUE,
  email               TEXT        NOT NULL,
  original_created_at TIMESTAMPTZ,
  synced_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE synced_sugoshu_resumes (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id    TEXT        NOT NULL,
  external_resume_id  TEXT,
  content             TEXT,
  original_created_at TIMESTAMPTZ,
  synced_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE synced_sugoshu_diagnoses (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id      TEXT        NOT NULL,
  external_diagnosis_id TEXT,
  diagnosis_data        JSONB,
  original_created_at   TIMESTAMPTZ,
  synced_at             TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- 5. インデックス（新規 synced テーブル + 既存修正）
-- =============================================================

-- synced_interviewai_*
CREATE INDEX idx_synced_interviewai_users_email ON synced_interviewai_users (LOWER(email));
CREATE INDEX idx_synced_interviewai_sessions_user ON synced_interviewai_sessions (external_user_id);
CREATE INDEX idx_synced_interviewai_searches_user ON synced_interviewai_searches (external_user_id);

-- synced_compai_*
CREATE INDEX idx_synced_compai_users_email ON synced_compai_users (LOWER(email));
CREATE INDEX idx_synced_compai_researches_user ON synced_compai_researches (external_user_id);
CREATE INDEX idx_synced_compai_messages_user ON synced_compai_messages (external_user_id);
CREATE INDEX idx_synced_compai_messages_research ON synced_compai_messages (external_research_id);

-- synced_sugoshu_*
CREATE INDEX idx_synced_sugoshu_users_email ON synced_sugoshu_users (LOWER(email));
CREATE INDEX idx_synced_sugoshu_resumes_user ON synced_sugoshu_resumes (external_user_id);
CREATE INDEX idx_synced_sugoshu_diagnoses_user ON synced_sugoshu_diagnoses (external_user_id);

-- synced_smartes_users: 既存の (email) インデックスを LOWER(email) に修正
DROP INDEX IF EXISTS idx_synced_smartes_users_email;
CREATE INDEX idx_synced_smartes_users_email ON synced_smartes_users (LOWER(email));

-- =============================================================
-- 6. RLS: 新規 synced テーブル（クライアントアクセス不可）
-- =============================================================

ALTER TABLE synced_interviewai_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_interviewai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_interviewai_searches ENABLE ROW LEVEL SECURITY;

ALTER TABLE synced_compai_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_compai_researches ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_compai_messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE synced_sugoshu_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_sugoshu_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_sugoshu_diagnoses ENABLE ROW LEVEL SECURITY;
