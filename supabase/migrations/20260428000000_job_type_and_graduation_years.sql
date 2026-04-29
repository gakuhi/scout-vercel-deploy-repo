-- =============================================================
-- 1. 職種カラム追加
-- =============================================================
ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS job_type TEXT;

-- =============================================================
-- 2. 対象卒業年度を単一値 → 配列に置き換え
--    target_graduation_year (INT) → target_graduation_years (INT[])
-- =============================================================

-- 既存データを一時カラムに配列化して退避
ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS target_graduation_years INT[] DEFAULT '{}';

UPDATE job_postings
  SET target_graduation_years = ARRAY[target_graduation_year]
  WHERE target_graduation_year IS NOT NULL;

-- 旧カラムを削除
ALTER TABLE job_postings DROP COLUMN IF EXISTS target_graduation_year;
