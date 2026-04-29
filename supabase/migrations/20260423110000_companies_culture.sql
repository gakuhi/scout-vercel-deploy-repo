-- companies に「社風・風土」自由記述カラムを追加。
-- 学生のスカウト詳細で description とは別枠で表示する。
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS culture TEXT;
