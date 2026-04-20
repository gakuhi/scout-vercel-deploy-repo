-- =============================================================
-- Storage: プロフィール画像バケット
-- =============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- 学生は自分のフォルダにのみアップロード可能
CREATE POLICY storage_profile_images_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 学生は自分のファイルのみ更新可能
CREATE POLICY storage_profile_images_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 学生は自分のファイルのみ削除可能
CREATE POLICY storage_profile_images_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 公開バケットなので誰でも閲覧可能
CREATE POLICY storage_profile_images_select ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profile-images');
