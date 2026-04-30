-- scout_status を ENUM から text に変更し、値の妥当性検証はアプリ層 (zod) に寄せる。
-- 過去に 'read' を ALTER TYPE で追加した経緯 (20260413100000_align_schema_with_design.sql) があり、
-- ステータスの増減頻度が高いため、DB スキーマ変更を伴わずアプリ層で柔軟に管理する方針へ移行する。

-- =========================================================
-- 0. scouts.status を参照している RLS ポリシーを一旦削除
--    （ENUM → text の ALTER COLUMN が依存ポリシーでブロックされるため）
-- =========================================================
DROP POLICY IF EXISTS chat_messages_insert_student ON chat_messages;
DROP POLICY IF EXISTS chat_messages_insert_company ON chat_messages;
DROP POLICY IF EXISTS students_select_company ON students;
DROP POLICY IF EXISTS storage_profile_images_select ON storage.objects;
DROP POLICY IF EXISTS chat_attachments_insert_student ON storage.objects;
DROP POLICY IF EXISTS chat_attachments_insert_company ON storage.objects;

-- =========================================================
-- 1-4. ENUM → text 変換
-- =========================================================

-- 1. デフォルト値を一旦外す（型変換時に enum リテラルを参照するため）
ALTER TABLE scouts ALTER COLUMN status DROP DEFAULT;

-- 2. text 型へキャスト
ALTER TABLE scouts ALTER COLUMN status TYPE text USING status::text;

-- 3. デフォルト値を再付与
ALTER TABLE scouts ALTER COLUMN status SET DEFAULT 'sent';

-- 4. 旧 ENUM 型を削除（依存がないことを CASCADE せずに明示確認）
DROP TYPE IF EXISTS scout_status;

-- =========================================================
-- 5. 削除した RLS ポリシーを再作成（元の定義と同一）
-- =========================================================

-- chat_messages: 学生は承諾済みスカウトのみ送信可
CREATE POLICY chat_messages_insert_student ON chat_messages
  FOR INSERT WITH CHECK (
    get_user_role() = 'student'
    AND sender_id = auth.uid()
    AND sender_role = 'student'
    AND EXISTS (
      SELECT 1 FROM scouts
      WHERE scouts.id = chat_messages.scout_id
      AND scouts.student_id = auth.uid()
      AND scouts.status = 'accepted'
    )
  );

-- chat_messages: 企業は承諾済みスカウトのみ送信可
CREATE POLICY chat_messages_insert_company ON chat_messages
  FOR INSERT WITH CHECK (
    get_user_role() IN ('company_owner', 'company_member')
    AND sender_id = auth.uid()
    AND sender_role = 'company_member'
    AND EXISTS (
      SELECT 1 FROM scouts
      WHERE scouts.id = chat_messages.scout_id
      AND scouts.company_id = get_company_id()
      AND scouts.status = 'accepted'
    )
  );

-- students: 企業は公開 or 承諾済みスカウト経由で閲覧可
CREATE POLICY students_select_company ON students
  FOR SELECT USING (
    get_user_role() IN ('company_owner', 'company_member')
    AND is_company_verified()
    AND (
      -- View 経由（検索時）: 公開 + 非削除
      (is_profile_public = true AND deleted_at IS NULL)
      OR
      -- 直接アクセス（承諾後）: 承諾済みスカウトの学生
      EXISTS (
        SELECT 1 FROM scouts
        WHERE scouts.student_id = students.id
        AND scouts.company_id = get_company_id()
        AND scouts.status = 'accepted'
      )
    )
  );

-- storage: プロフィール画像は本人 or 閲覧権限を持つ企業のみ
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

-- chat-attachments: 学生は accepted スカウトの当事者のみ
CREATE POLICY chat_attachments_insert_student ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND get_user_role() = 'student'
  AND owner = auth.uid()
  AND EXISTS (
    SELECT 1 FROM scouts s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND s.student_id = auth.uid()
      AND s.status = 'accepted'
  )
);

-- chat-attachments: 企業担当者は accepted スカウトかつ自社のみ
CREATE POLICY chat_attachments_insert_company ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND get_user_role() IN ('company_owner', 'company_member')
  AND owner = auth.uid()
  AND EXISTS (
    SELECT 1 FROM scouts s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND s.company_id = get_company_id()
      AND s.status = 'accepted'
  )
);
