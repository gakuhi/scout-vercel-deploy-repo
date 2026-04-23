-- =============================================================
-- 企業ロゴ画像用 Public バケット
-- =============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- パス規約: `<company_id>/logo.<ext>`
-- INSERT/UPDATE/DELETE は「該当 company の owner または admin」のみ許可。
-- (storage.foldername(name))[1] が先頭フォルダ = company_id を取り出す。
CREATE POLICY storage_company_logos_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text
      FROM company_members
      WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY storage_company_logos_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text
      FROM company_members
      WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY storage_company_logos_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text
      FROM company_members
      WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Public バケットなので SELECT ポリシーは不要（誰でも閲覧可）
