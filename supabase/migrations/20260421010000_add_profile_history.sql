-- =============================================================
-- student_integrated_profile_history
-- student_integrated_profiles の過去バージョンを蓄積するログテーブル。
-- BEFORE UPDATE トリガーで OLD 行を自動コピーするため、
-- アプリケーション側のコード変更は不要。
--
-- 本 migration は 20260421000000_align_profile_to_matching_design.sql
-- による設計書 03-02 準拠のスキーマを前提とする。
-- =============================================================

CREATE TABLE student_integrated_profile_history (
  id                             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id                     UUID        NOT NULL REFERENCES students(id),
  -- E. 人物要約
  summary                        TEXT,
  strengths                      JSONB,
  skills                         JSONB,
  -- A. 志向・価値観スコア
  growth_stability_score         SMALLINT,
  specialist_generalist_score    SMALLINT,
  individual_team_score          SMALLINT,
  autonomy_guidance_score        SMALLINT,
  -- B. 能力スコア
  logical_thinking_score         SMALLINT,
  communication_score            SMALLINT,
  writing_skill_score            SMALLINT,
  leadership_score               SMALLINT,
  -- C. 活動量スコア
  activity_volume_score          SMALLINT,
  -- D. 興味タグ（許容値・配列長はサーバ層で検証。詳細は 20260421000000 参照）
  interested_industries          TEXT[],
  interested_job_types           TEXT[],
  -- メタ
  score_confidence               SMALLINT,
  generated_at                   TIMESTAMPTZ,
  model_version                  TEXT,
  archived_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 学生の履歴を新しい順に取得するためのインデックス
CREATE INDEX idx_profile_history_student_id
  ON student_integrated_profile_history (student_id, generated_at DESC);

-- =============================================================
-- トリガー: UPDATE / DELETE 時に OLD 行を履歴テーブルへ自動コピー
--   - UPDATE: 再生成前の旧プロフィールを履歴化
--   - DELETE: 明示削除（管理オペ等）時も記録を残す
--   - BEFORE DELETE は OLD を返すことで削除を許可する
-- =============================================================

CREATE OR REPLACE FUNCTION archive_integrated_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO student_integrated_profile_history (
    student_id, summary, strengths, skills,
    growth_stability_score, specialist_generalist_score,
    individual_team_score, autonomy_guidance_score,
    logical_thinking_score, communication_score,
    writing_skill_score, leadership_score, activity_volume_score,
    interested_industries, interested_job_types,
    score_confidence, generated_at, model_version
  ) VALUES (
    OLD.student_id, OLD.summary, OLD.strengths, OLD.skills,
    OLD.growth_stability_score, OLD.specialist_generalist_score,
    OLD.individual_team_score, OLD.autonomy_guidance_score,
    OLD.logical_thinking_score, OLD.communication_score,
    OLD.writing_skill_score, OLD.leadership_score, OLD.activity_volume_score,
    OLD.interested_industries, OLD.interested_job_types,
    OLD.score_confidence, OLD.generated_at, OLD.model_version
  );
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER archive_integrated_profile_trigger
  BEFORE UPDATE OR DELETE ON student_integrated_profiles
  FOR EACH ROW EXECUTE FUNCTION archive_integrated_profile();

-- =============================================================
-- RLS: 履歴テーブルは最新プロフィールと同じアクセス制御方針
-- （20260415200000_integrated_profile_alignment.sql の
--   data_consent_granted_at IS NOT NULL ルールも踏襲）
-- =============================================================

ALTER TABLE student_integrated_profile_history ENABLE ROW LEVEL SECURITY;

-- 学生: 自分の履歴のみ閲覧可
CREATE POLICY student_integrated_profile_history_select ON student_integrated_profile_history
  FOR SELECT USING (auth.uid() = student_id);

-- 企業担当者: 公開 + 同意済みの学生の履歴のみ閲覧可
CREATE POLICY student_integrated_profile_history_select_company ON student_integrated_profile_history
  FOR SELECT USING (
    get_user_role() IN ('company_owner', 'company_member')
    AND is_company_verified()
    AND EXISTS (
      SELECT 1 FROM students
      WHERE students.id = student_integrated_profile_history.student_id
        AND students.is_profile_public = true
        AND students.deleted_at IS NULL
        AND students.data_consent_granted_at IS NOT NULL
    )
  );
