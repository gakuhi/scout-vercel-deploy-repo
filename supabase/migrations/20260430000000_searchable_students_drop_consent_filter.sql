-- =============================================================
-- searchable_students: data_consent_granted_at の絞り込みを撤去
--
-- 現状: 連携同意がない学生は検索結果に出てこない
--       （View の WHERE と students_select_company / student_integrated_profiles_select_company
--        の RLS ポリシーの両方で除外されていた）
-- 変更: 同意フラグに関わらず公開プロフィール全件を検索対象にする
--       （連携データの有無は検索結果のスコア精度に反映される設計）
-- =============================================================

-- 1. View 再作成（WHERE から data_consent_granted_at を撤去）
DROP VIEW IF EXISTS searchable_students;

CREATE VIEW searchable_students WITH (security_invoker = true) AS
SELECT
  s.academic_type,
  s.bio,
  s.department,
  s.faculty,
  s.graduation_year,
  s.id,
  s.prefecture,
  s.profile_image_url,
  s.university,
  sip.activity_volume_score,
  sip.autonomy_guidance_score,
  sip.communication_score,
  sip.growth_stability_score,
  sip.individual_team_score,
  sip.interested_industries,
  sip.interested_job_types,
  sip.leadership_score,
  sip.logical_thinking_score,
  sip.score_confidence,
  sip.skills,
  sip.specialist_generalist_score,
  sip.strengths,
  sip.summary,
  sip.writing_skill_score
FROM students s
LEFT JOIN student_integrated_profiles sip ON sip.student_id = s.id
WHERE s.is_profile_public = true
  AND s.deleted_at IS NULL;

-- 2. students_select_company: View 経由パスから同意条件を撤去
--    （承諾後の直接アクセスパスは従来通り）
DROP POLICY IF EXISTS students_select_company ON students;
CREATE POLICY students_select_company ON students
  FOR SELECT USING (
    get_user_role() IN ('company_owner', 'company_member')
    AND is_company_verified()
    AND (
      -- View 経由（検索時）: 公開 + 非削除
      (is_profile_public = true AND deleted_at IS NULL)
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

-- 3. student_integrated_profiles_select_company: 同意条件を撤去
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
    )
  );
