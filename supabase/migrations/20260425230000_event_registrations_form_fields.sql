-- ============================================================================
-- event_registrations: 申込フォーム入力の永続化 + 残席数取得関数
-- ============================================================================

-- 1) 申込フォーム入力の保存先カラム追加
--    プロフィールから初期値を入れるが、ダイアログ上で学生が編集した値を残せるように
--    event_registrations 側にも保持する。motivation は元から DB に置き場が無かった。
ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS applicant_name        TEXT,
  ADD COLUMN IF NOT EXISTS applicant_email       TEXT,
  ADD COLUMN IF NOT EXISTS applicant_affiliation TEXT,
  ADD COLUMN IF NOT EXISTS motivation            TEXT;

-- 学生が UPDATE で書き換えられるカラムを追加（status / cancelled_at に加えて、
-- 再申込時にフォーム値も更新できるようにする）。
GRANT UPDATE (
  status, cancelled_at,
  applicant_name, applicant_email, applicant_affiliation, motivation
) ON event_registrations TO authenticated;

-- 2) イベント別の applied 件数を返す関数。
--    学生ロールの RLS では他学生の registration が見えないため、UI 側で「残席」を
--    出すには SECURITY DEFINER で集計をバイパスする必要がある。
CREATE OR REPLACE FUNCTION public.get_event_applied_counts(event_ids UUID[])
RETURNS TABLE (event_id UUID, applied_count BIGINT) AS $$
  SELECT er.event_id, COUNT(*)::BIGINT AS applied_count
  FROM event_registrations er
  JOIN events e ON e.id = er.event_id
  WHERE er.event_id = ANY(event_ids)
    AND er.status = 'applied'
    -- 公開かつ未削除のイベントだけ（漏えい対策: 非公開 event_id を投機しても 0 件になる）
    AND e.is_published = true
    AND e.deleted_at IS NULL
  GROUP BY er.event_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.get_event_applied_counts(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_applied_counts(UUID[]) TO authenticated, anon;
