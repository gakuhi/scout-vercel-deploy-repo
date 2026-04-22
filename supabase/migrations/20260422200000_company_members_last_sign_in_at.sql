-- =============================================================
-- company_members.last_sign_in_at を auth.users から同期
-- =============================================================
-- メンバー一覧の「最終ログイン」表示のために admin.auth.admin.listUsers()
-- で auth.users 全件をフェッチしていたが、学生含む全ユーザーを舐めるため
-- スケールしない。auth.users → company_members へトリガでミラーリングし、
-- アプリ側は RLS で守られた company_members だけを読めば済むようにする。

-- 1. カラム追加
ALTER TABLE company_members
  ADD COLUMN last_sign_in_at TIMESTAMPTZ;

-- 2. 既存データのバックフィル
UPDATE company_members cm
SET last_sign_in_at = au.last_sign_in_at
FROM auth.users au
WHERE cm.id = au.id
  AND au.last_sign_in_at IS NOT NULL;

-- 3. 同期トリガ
CREATE OR REPLACE FUNCTION public.sync_company_member_last_sign_in()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.company_members
  SET last_sign_in_at = NEW.last_sign_in_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_company_member_last_sign_in
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at)
  EXECUTE FUNCTION public.sync_company_member_last_sign_in();
