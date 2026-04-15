-- =============================================================
-- スキーマ設計書(03-00-schema.md)との整合性修正 (2)
-- - 旧 synced_* テーブルの削除
-- - interviewai / compai / sugoshu 連携テーブルの作成
-- - RLSポリシー修正（companies UPDATE / job_postings SELECT / events SELECT）
-- =============================================================

-- =============================================================
-- 1. 旧 synced_* テーブルの削除
-- =============================================================

-- RLSポリシーを先に削除
DROP POLICY IF EXISTS synced_es_entries_select ON synced_es_entries;
DROP POLICY IF EXISTS synced_researches_select ON synced_researches;
DROP POLICY IF EXISTS synced_interview_sessions_select ON synced_interview_sessions;
DROP POLICY IF EXISTS synced_activities_select ON synced_activities;

-- テーブルを削除（インデックスも自動削除される）
DROP TABLE IF EXISTS synced_es_entries;
DROP TABLE IF EXISTS synced_researches;
DROP TABLE IF EXISTS synced_interview_sessions;
DROP TABLE IF EXISTS synced_activities;

-- =============================================================
-- 2. 面接練習AI（interviewai）連携テーブル
-- =============================================================

CREATE TABLE synced_interviewai_users (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id    TEXT        NOT NULL UNIQUE,
  email               TEXT        NOT NULL,
  original_created_at TIMESTAMPTZ,
  synced_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE synced_interviewai_sessions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id      TEXT        NOT NULL,
  external_session_id   TEXT        NOT NULL,
  company_name          TEXT,
  session_type          TEXT,
  industry              TEXT,
  phase                 TEXT,
  status                TEXT,
  overall_score         INT,
  skill_scores          JSONB,
  strengths             JSONB,
  areas_for_improvement JSONB,
  growth_hint           TEXT,
  conversation_text     JSONB,
  started_at            TIMESTAMPTZ,
  original_created_at   TIMESTAMPTZ,
  synced_at             TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE synced_interviewai_searches (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id    TEXT        NOT NULL,
  external_search_id  TEXT        NOT NULL,
  company_name        TEXT,
  searched_at         TIMESTAMPTZ,
  synced_at           TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- 3. 企業分析AI（compai）連携テーブル
-- =============================================================

CREATE TABLE synced_compai_users (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id    TEXT        NOT NULL UNIQUE,
  email               TEXT        NOT NULL,
  original_created_at TIMESTAMPTZ,
  synced_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE synced_compai_researches (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id     TEXT        NOT NULL,
  external_research_id TEXT        NOT NULL,
  title                TEXT,
  url                  TEXT,
  content              TEXT,
  raw_content          TEXT,
  citations            JSONB,
  is_bookmarked        BOOLEAN,
  status               TEXT,
  original_created_at  TIMESTAMPTZ,
  synced_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE synced_compai_messages (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id     TEXT        NOT NULL,
  external_message_id  TEXT        NOT NULL,
  external_research_id TEXT        NOT NULL,
  content              TEXT,
  sender_type          TEXT,
  original_created_at  TIMESTAMPTZ,
  synced_at            TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- 4. すごい就活（sugoshu）連携テーブル
-- =============================================================

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
-- 5. インデックス
-- =============================================================

-- interviewai
CREATE INDEX idx_synced_interviewai_users_email ON synced_interviewai_users (LOWER(email));
CREATE INDEX idx_synced_interviewai_sessions_user ON synced_interviewai_sessions (external_user_id);
CREATE INDEX idx_synced_interviewai_searches_user ON synced_interviewai_searches (external_user_id);

-- compai
CREATE INDEX idx_synced_compai_users_email ON synced_compai_users (LOWER(email));
CREATE INDEX idx_synced_compai_researches_user ON synced_compai_researches (external_user_id);
CREATE INDEX idx_synced_compai_messages_user ON synced_compai_messages (external_user_id);
CREATE INDEX idx_synced_compai_messages_research ON synced_compai_messages (external_research_id);

-- sugoshu
CREATE INDEX idx_synced_sugoshu_users_email ON synced_sugoshu_users (LOWER(email));
CREATE INDEX idx_synced_sugoshu_resumes_user ON synced_sugoshu_resumes (external_user_id);
CREATE INDEX idx_synced_sugoshu_diagnoses_user ON synced_sugoshu_diagnoses (external_user_id);

-- =============================================================
-- 6. RLS — 新規 synced テーブル（Service Role のみアクセス可）
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

-- RLSポリシーなし = クライアント（anon/authenticated）からのアクセスは全拒否
-- Service Role Key は RLS をバイパスするので ETL ジョブからは読み書き可能
-- （synced_smartes_* テーブルと同じ方針）

-- =============================================================
-- 7. anon ロールのアクセス拒否（新規テーブル分）
-- =============================================================

REVOKE ALL ON synced_interviewai_users FROM anon;
REVOKE ALL ON synced_interviewai_sessions FROM anon;
REVOKE ALL ON synced_interviewai_searches FROM anon;
REVOKE ALL ON synced_compai_users FROM anon;
REVOKE ALL ON synced_compai_researches FROM anon;
REVOKE ALL ON synced_compai_messages FROM anon;
REVOKE ALL ON synced_sugoshu_users FROM anon;
REVOKE ALL ON synced_sugoshu_resumes FROM anon;
REVOKE ALL ON synced_sugoshu_diagnoses FROM anon;

-- =============================================================
-- 8. RLSポリシー修正
-- =============================================================

-- 8-1. companies UPDATE: company_admin を追加（設計書: 「owner/admin のみ自社を更新」）
DROP POLICY IF EXISTS companies_update_owner ON companies;
CREATE POLICY companies_update_owner_admin ON companies
  FOR UPDATE USING (
    get_user_role() IN ('company_owner', 'company_admin')
    AND id = get_company_id()
  );

-- 8-2. job_postings SELECT (学生): deleted_at IS NULL を追加
--      align_schema_with_design で再作成時に欠落していた
DROP POLICY IF EXISTS job_postings_select_student ON job_postings;
CREATE POLICY job_postings_select_student ON job_postings
  FOR SELECT USING (
    get_user_role() = 'student'
    AND is_published = true
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = job_postings.company_id
      AND companies.is_verified = true
    )
  );

-- 8-3. events SELECT (学生): deleted_at IS NULL を追加
--      align_schema_with_design で再作成時に欠落していた
DROP POLICY IF EXISTS events_select_student ON events;
CREATE POLICY events_select_student ON events
  FOR SELECT USING (
    get_user_role() = 'student'
    AND is_published = true
    AND deleted_at IS NULL
    AND (
      organizer_type = 'platform'
      OR EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = events.company_id
        AND companies.is_verified = true
      )
    )
  );
