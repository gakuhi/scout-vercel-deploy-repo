-- =============================================================
-- 統合プロフィール関連の整合性修正（06-00-data-integration.md 準拠）
-- 1. activity_level Enum 作成 + カラム型変更
-- 2. View に data_consent_granted_at IS NOT NULL を追加
-- 3. RLS に data_consent_granted_at チェックを追加
-- =============================================================

-- =============================================================
-- 1. View を先に DROP（activity_level カラムに依存しているため）
-- =============================================================

DROP VIEW IF EXISTS searchable_students;
DROP VIEW IF EXISTS public_students;

-- =============================================================
-- 2. activity_level Enum 作成 + カラム型変更
-- =============================================================

CREATE TYPE activity_level AS ENUM ('low', 'medium', 'high', 'very_high');

ALTER TABLE student_integrated_profiles
  ALTER COLUMN activity_level TYPE activity_level
  USING activity_level::activity_level;

-- =============================================================
-- 3. View 再作成（data_consent_granted_at IS NOT NULL を追加）
-- =============================================================

CREATE VIEW public_students WITH (security_invoker = true) AS
SELECT
  s.id,
  s.university,
  s.faculty,
  s.department,
  s.academic_type,
  s.graduation_year,
  s.prefecture,
  s.profile_image_url,
  s.bio
FROM students s
WHERE s.is_profile_public = true
  AND s.deleted_at IS NULL
  AND s.data_consent_granted_at IS NOT NULL;

CREATE VIEW searchable_students WITH (security_invoker = true) AS
SELECT
  s.id,
  s.university,
  s.faculty,
  s.academic_type,
  s.graduation_year,
  s.prefecture,
  s.profile_image_url,
  s.bio,
  sip.summary,
  sip.strengths,
  sip.interests,
  sip.skills,
  sip.preferred_work_locations,
  sip.activity_level
FROM students s
LEFT JOIN student_integrated_profiles sip ON sip.student_id = s.id
WHERE s.is_profile_public = true
  AND s.deleted_at IS NULL
  AND s.data_consent_granted_at IS NOT NULL;

-- =============================================================
-- 4. RLS 修正: data_consent_granted_at IS NOT NULL を追加
-- =============================================================

-- 4-1. students_select_company: 公開プロフィールパスに同意チェック追加
DROP POLICY IF EXISTS students_select_company ON students;
CREATE POLICY students_select_company ON students
  FOR SELECT USING (
    get_user_role() IN ('company_owner', 'company_member')
    AND is_company_verified()
    AND (
      -- View 経由（検索時）: 公開 + 同意済み + 非削除
      (is_profile_public = true AND deleted_at IS NULL AND data_consent_granted_at IS NOT NULL)
      OR
      -- 直接アクセス（承諾後）: 承諾済みスカウトの学生
      EXISTS (
        SELECT 1 FROM scouts
        WHERE scouts.student_id = students.id
        AND scouts.company_id = get_company_id()
        AND scouts.status = 'accepted'
      )
    )
  );

-- 4-2. student_integrated_profiles_select_company: 同意チェック追加
DROP POLICY IF EXISTS student_integrated_profiles_select_company ON student_integrated_profiles;
CREATE POLICY student_integrated_profiles_select_company ON student_integrated_profiles
  FOR SELECT USING (
    get_user_role() IN ('company_owner', 'company_member')
    AND is_company_verified()
    AND EXISTS (
      SELECT 1 FROM students
      WHERE students.id = student_integrated_profiles.student_id
      AND students.is_profile_public = true
      AND students.deleted_at IS NULL
      AND students.data_consent_granted_at IS NOT NULL
    )
  );
