-- =============================================================
-- Storage: profile-images の UPDATE ポリシーに WITH CHECK を追加
-- =============================================================
-- USING のみのポリシーだと UPDATE 時に name カラム（= storage path）を
-- 他人のフォルダ下に書き換えられる余地があった。WITH CHECK で
-- 「更新後の値」も同条件で縛り、クロスユーザー書き込みを防止する。
--
-- 既存マイグレーション 20260416100000_storage_profile_images.sql は
-- 既に staging / 本番に適用済みのため、その場で再編集しても再実行されない。
-- 新規マイグレーションで ALTER POLICY して全環境に確実に反映させる。

ALTER POLICY storage_profile_images_update ON storage.objects
  WITH CHECK (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
