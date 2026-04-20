-- =============================================================
-- Storage: プロフィール画像バケットを Private 化
--
-- 背景:
--   これまで profile-images バケットは public = true で、
--   誰でも URL を知っていれば閲覧できる状態だった。
--   個人情報保護法の安全管理措置の観点から Private 化する。
--
-- 閲覧可能なユーザー:
--   - 本人（自分のフォルダのオブジェクト）
--   - 承諾済みスカウトの送信企業、または公開プロフィール設定＋同意済み学生を検索する企業
--     （students_select_company と同条件）
-- =============================================================

-- 1. バケットを Private に変更
UPDATE storage.buckets SET public = false WHERE id = 'profile-images';

-- 2. 既存レコードの公開 URL → path 形式に変換
--    例: https://xxx.supabase.co/storage/v1/object/public/profile-images/{uid}/avatar.jpg
--        → {uid}/avatar.jpg
UPDATE students
SET profile_image_url = regexp_replace(
  profile_image_url,
  '^https?://[^/]+/storage/v1/object/public/profile-images/',
  ''
)
WHERE profile_image_url LIKE '%/storage/v1/object/public/profile-images/%';

-- 3. 既存の SELECT ポリシーを削除（誰でも閲覧可能だったもの）
DROP POLICY IF EXISTS storage_profile_images_select ON storage.objects;

-- 4. 新 SELECT ポリシー: 本人 OR 閲覧権限を持つ企業のみ
CREATE POLICY storage_profile_images_select ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'profile-images'
    AND (
      -- 本人アクセス
      auth.uid()::text = (storage.foldername(name))[1]
      OR
      -- 閲覧権限を持つ企業（students_select_company と同条件）
      (
        get_user_role() IN ('company_owner', 'company_member')
        AND is_company_verified()
        AND EXISTS (
          SELECT 1 FROM students s
          WHERE s.id::text = (storage.foldername(name))[1]
            AND (
              -- 公開プロフィール + 同意済み + 非削除
              (s.is_profile_public = true
                AND s.deleted_at IS NULL
                AND s.data_consent_granted_at IS NOT NULL)
              OR
              -- 承諾済みスカウト経由
              EXISTS (
                SELECT 1 FROM scouts
                WHERE scouts.student_id = s.id
                  AND scouts.company_id = get_company_id()
                  AND scouts.status = 'accepted'
              )
            )
        )
      )
    )
  );
