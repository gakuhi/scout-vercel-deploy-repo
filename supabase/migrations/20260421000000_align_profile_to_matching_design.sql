-- =============================================================
-- student_integrated_profiles を 03-02-matching-design.md に準拠させる
--
-- 変更内容:
-- 1. searchable_students View を先に DROP（旧カラムに依存）
-- 2. student_integrated_profiles の旧カラム (interests /
--    preferred_work_locations / activity_level) を DROP し、
--    設計書が要求するスコア 9 列・興味タグ 2 列・score_confidence を ADD
-- 3. 不要になった activity_level enum を DROP
-- 4. searchable_students View を新スキーマで再作成
--
-- 設計判断（カテゴリは TEXT、enum 化しない）:
--   業界・職種・勤務地のカテゴリは MVP 期に語彙が揺れる前提で TEXT[] とする。
--   PostgreSQL enum は ADD VALUE しかできず rename / remove が実質不可なため、
--   揺らぎを吸収できる TEXT を選択。許容値の検証はサーバ層（zod）で行い、
--   許容値の単一ソースは src/features/student/profile/mock.ts の
--   IndustryCategory / JobCategory 型 + Label Record とする。
--   配列長の上限（5）も DB ではなく zod で担保する。
-- =============================================================

-- =============================================================
-- 1. searchable_students View を DROP（旧カラムに依存しているため）
-- =============================================================

DROP VIEW IF EXISTS searchable_students;

-- =============================================================
-- 2. student_integrated_profiles のカラム入れ替え
-- =============================================================

ALTER TABLE student_integrated_profiles
  DROP COLUMN interests,
  DROP COLUMN preferred_work_locations,
  DROP COLUMN activity_level,
  -- A. 志向・価値観スコア（スペクトラム: 0-100）
  ADD COLUMN growth_stability_score      SMALLINT,
  ADD COLUMN specialist_generalist_score SMALLINT,
  ADD COLUMN individual_team_score       SMALLINT,
  ADD COLUMN autonomy_guidance_score     SMALLINT,
  -- B. 能力スコア（絶対: 0-100、leadership のみ NULL 許容）
  ADD COLUMN logical_thinking_score      SMALLINT,
  ADD COLUMN communication_score         SMALLINT,
  ADD COLUMN writing_skill_score         SMALLINT,
  ADD COLUMN leadership_score            SMALLINT,
  -- C. 活動量スコア（相対: 0-100）
  ADD COLUMN activity_volume_score       SMALLINT,
  -- D. 興味タグ（行動データから自動抽出）。許容値・配列長はサーバ層で検証
  ADD COLUMN interested_industries       TEXT[],
  ADD COLUMN interested_job_types        TEXT[],
  -- メタ
  ADD COLUMN score_confidence            SMALLINT;

-- スコアは 0-100 の範囲であることを DB で担保
ALTER TABLE student_integrated_profiles
  ADD CONSTRAINT chk_growth_stability_score      CHECK (growth_stability_score      IS NULL OR growth_stability_score      BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_specialist_generalist_score CHECK (specialist_generalist_score IS NULL OR specialist_generalist_score BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_individual_team_score       CHECK (individual_team_score       IS NULL OR individual_team_score       BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_autonomy_guidance_score     CHECK (autonomy_guidance_score     IS NULL OR autonomy_guidance_score     BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_logical_thinking_score      CHECK (logical_thinking_score      IS NULL OR logical_thinking_score      BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_communication_score         CHECK (communication_score         IS NULL OR communication_score         BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_writing_skill_score         CHECK (writing_skill_score         IS NULL OR writing_skill_score         BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_leadership_score            CHECK (leadership_score            IS NULL OR leadership_score            BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_activity_volume_score       CHECK (activity_volume_score       IS NULL OR activity_volume_score       BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_score_confidence            CHECK (score_confidence            IS NULL OR score_confidence            BETWEEN 0 AND 100);

-- =============================================================
-- 3. 不要になった activity_level enum を DROP
-- =============================================================

DROP TYPE IF EXISTS activity_level;

-- =============================================================
-- 4. searchable_students View を新スキーマで再作成
--    WHERE 条件は 20260415200000_integrated_profile_alignment.sql を踏襲
--
-- [!] このビューはカラム追加のたびに DROP/CREATE される運用。
--     #207 (desired_locations) / #208 (desired_industries) /
--     #209 (desired_job_types) で再作成予定。
--     カラムは {テーブル別名}.{カラム名} のアルファベット順で並べ、
--     diff レビューしやすくする。
-- =============================================================

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
  AND s.deleted_at IS NULL
  AND s.data_consent_granted_at IS NOT NULL;
