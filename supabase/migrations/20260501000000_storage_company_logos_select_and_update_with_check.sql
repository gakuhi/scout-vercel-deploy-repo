-- =============================================================
-- Storage: company-logos に SELECT ポリシーを追加 + UPDATE に WITH CHECK
-- =============================================================
-- 既存マイグレーション 20260420100000_storage_company_logos.sql は
-- 既に staging / 本番に適用済みのため、その場で再編集しても再実行されない。
-- 新規マイグレーションで対応する。
--
-- 1. SELECT ポリシー不在の問題:
--    Supabase storage-api が upsert で発行する SQL は
--      INSERT ... ON CONFLICT (name, bucket_id) DO UPDATE ... RETURNING *
--    という形式。PostgreSQL の RLS 仕様として、ON CONFLICT 句がある場合は
--    conflict が起きていなくても SELECT ポリシーの評価が要求されるため、
--    SELECT ポリシー不在だと初回アップロードでも RLS 違反で弾かれる。
--    元マイグレーションのコメント「Public バケットなので SELECT ポリシー不要」
--    は誤りで、Public バケットの匿名 URL アクセスと storage.objects の
--    RLS は別レイヤー。profile-images / job-images と同パターンで揃える。
--
-- 2. UPDATE ポリシーの WITH CHECK 不在:
--    profile-images の 20260425000000 と同じ理由で明示追加する。
--    USING のみだと更新後の name を別フォルダに書き換える経路が残る。

-- 1. SELECT ポリシー追加
DROP POLICY IF EXISTS storage_company_logos_select ON storage.objects;
CREATE POLICY storage_company_logos_select ON storage.objects
  FOR SELECT
  USING (bucket_id = 'company-logos');

-- 2. UPDATE ポリシーに WITH CHECK を追加
ALTER POLICY storage_company_logos_update ON storage.objects
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text
      FROM company_members
      WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );
