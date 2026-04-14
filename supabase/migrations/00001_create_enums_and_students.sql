-- ==================================================
-- Enum types (auth-relevant subset)
-- ==================================================
CREATE TYPE public.user_role AS ENUM (
  'student',
  'company_owner',
  'company_admin',
  'company_member'
);

CREATE TYPE public.academic_type AS ENUM (
  'liberal_arts',
  'science',
  'other'
);

-- ==================================================
-- students テーブル
-- ==================================================
CREATE TABLE public.students (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  last_name       TEXT,
  first_name      TEXT,
  last_name_kana  TEXT,
  first_name_kana TEXT,
  phone           TEXT,
  birthdate       DATE,
  gender          TEXT,
  university      TEXT,
  faculty         TEXT,
  department      TEXT,
  academic_type   public.academic_type,
  graduation_year INT,
  prefecture      TEXT,
  postal_code     TEXT,
  city            TEXT,
  street          TEXT,
  profile_image_url TEXT,
  bio             TEXT,
  is_profile_public BOOLEAN DEFAULT false,
  data_consent_granted_at TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.students IS '学生統合プロフィール。id は auth.users(id) と一致。';

-- ==================================================
-- RLS
-- ==================================================
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_select_own" ON public.students
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "students_insert_own" ON public.students
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "students_update_own" ON public.students
  FOR UPDATE USING (auth.uid() = id);

-- ==================================================
-- updated_at 自動更新トリガー
-- ==================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ==================================================
-- 新規ユーザーにデフォルト student ロールを設定
-- マジックリンク経由のサインアップで role が未設定になる問題を解決
-- ==================================================
CREATE OR REPLACE FUNCTION public.set_default_student_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_app_meta_data IS NULL OR NOT (NEW.raw_app_meta_data ? 'role') THEN
    NEW.raw_app_meta_data = COALESCE(NEW.raw_app_meta_data, '{}'::jsonb)
      || '{"role": "student"}'::jsonb;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_default_role_on_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.set_default_student_role();
