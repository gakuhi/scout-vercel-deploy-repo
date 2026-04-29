-- =============================================================
-- 求人トップ画像
-- =============================================================

-- 1. カラム追加
ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS hero_image_path TEXT;

-- 2. Storage bucket（private、10MB上限）
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('job-images', 'job-images', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS

-- 閲覧: ログイン済みなら誰でも（学生が求人画像を見る必要がある）
DROP POLICY IF EXISTS "job_images_select_authenticated" ON storage.objects;
CREATE POLICY "job_images_select_authenticated" ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'job-images');

-- アップロード: 企業メンバーのみ
DROP POLICY IF EXISTS "job_images_insert_company" ON storage.objects;
CREATE POLICY "job_images_insert_company" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'job-images'
  AND get_user_role() IN ('company_owner', 'company_member')
);

-- 削除: 企業メンバーのみ（画像差し替え用）
DROP POLICY IF EXISTS "job_images_delete_company" ON storage.objects;
CREATE POLICY "job_images_delete_company" ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'job-images'
  AND get_user_role() IN ('company_owner', 'company_member')
);
