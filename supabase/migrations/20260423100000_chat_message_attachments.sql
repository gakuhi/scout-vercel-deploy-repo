-- =============================================================
-- Chat message attachments
--
-- - chat_messages に添付メタ情報を JSONB で持たせる
-- - 実ファイルは Storage bucket "chat-attachments" に保存
-- - Path 規約: "{scout_id}/{random}.{ext}"
--   先頭セグメントの scout_id を使って RLS でスカウト当事者のみ許可する
-- =============================================================

-- ----- 1. chat_messages.attachments カラム追加 -----
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

-- アプリ層で INSERT するため、schema cache 反映のみ。UPDATE は既存の
-- `GRANT UPDATE (read_at)` により依然 read_at のみに制限される。

-- ----- 2. Storage bucket -----
-- private bucket。read は RLS + signed URL でゲート。
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-attachments', 'chat-attachments', false, 20971520)  -- 20MB
ON CONFLICT (id) DO NOTHING;

-- ----- 3. Storage RLS -----
-- 既存ポリシーがあれば先に drop（冪等に適用できるようにする）
DROP POLICY IF EXISTS "chat_attachments_select_student" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_select_company" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_insert_student" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_insert_company" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_delete_owner" ON storage.objects;

-- SELECT: 学生はスカウト当事者のみ
CREATE POLICY "chat_attachments_select_student" ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND get_user_role() = 'student'
  AND EXISTS (
    SELECT 1 FROM scouts s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND s.student_id = auth.uid()
  )
);

-- SELECT: 企業担当者は自社スカウトのみ
CREATE POLICY "chat_attachments_select_company" ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND get_user_role() IN ('company_owner', 'company_member')
  AND EXISTS (
    SELECT 1 FROM scouts s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND s.company_id = get_company_id()
  )
);

-- INSERT: 学生は accepted スカウトの当事者のみ
CREATE POLICY "chat_attachments_insert_student" ON storage.objects
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

-- INSERT: 企業担当者は accepted スカウトかつ自社のみ
CREATE POLICY "chat_attachments_insert_company" ON storage.objects
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

-- DELETE: アップロード者本人のみ（送信取消用）
CREATE POLICY "chat_attachments_delete_owner" ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND owner = auth.uid()
);
