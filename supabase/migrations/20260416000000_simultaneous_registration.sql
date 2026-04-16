-- =============================================================
-- 同時登録基盤: スキーマ変更
-- Based on: docs/development/07-simultaneous-registration-design.md
-- =============================================================

-- =============================================================
-- 1. students テーブルにカラム追加
-- =============================================================

-- LINE UID（LINEログインの識別子。LINE Login の ID token の sub）
ALTER TABLE students ADD COLUMN line_uid TEXT UNIQUE;

-- LINE 表示名（プロフィール表示用）
ALTER TABLE students ADD COLUMN line_display_name TEXT;

-- 登録元プロダクト（どのプロダクト経由で同時登録されたか。直接登録は NULL）
ALTER TABLE students ADD COLUMN registration_source product_source;

-- =============================================================
-- 2. line_friendships テーブル作成
-- =============================================================

CREATE TABLE line_friendships (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID        NOT NULL REFERENCES students(id),
  line_uid      TEXT        NOT NULL,
  is_friend     BOOLEAN     DEFAULT true,
  followed_at   TIMESTAMPTZ DEFAULT now(),
  unfollowed_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE(student_id),
  UNIQUE(line_uid)
);

-- =============================================================
-- 3. RLS 有効化 + ポリシー
-- =============================================================

ALTER TABLE line_friendships ENABLE ROW LEVEL SECURITY;

-- 学生本人のみ自分の友だち状態を閲覧可能
CREATE POLICY "students_select_own_line_friendship"
  ON line_friendships
  FOR SELECT
  USING (
    student_id = auth.uid()
    AND public.get_user_role() = 'student'
  );

-- line_friendships の INSERT / UPDATE / DELETE はサーバー側（Service Role）のみ
-- LINE Webhook で更新するた��、クライアントからの直接操作は不可
-- Service Role Key は RLS をバイパスするため、ポリシー追加不要

-- =============================================================
-- 4. updated_at 自動更新トリガー
-- =============================================================

-- トリガー関数（既存の関数がない場合のみ作成）
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER line_friendships_updated_at
  BEFORE UPDATE ON line_friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
