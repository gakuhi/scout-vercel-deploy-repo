-- ============================================================================
-- register_for_event: 定員チェック + 申込確定を 1 トランザクションで原子化
-- ============================================================================
-- 背景:
--   従来の actions.ts では「事前 SELECT で残席を確認 → INSERT」の 2 段階で
--   実装していたため、残り 1 枠に対して同時応募が来ると両方とも SELECT を
--   通過して両方 INSERT が成功する race condition があった。
--   本 RPC で
--     1) events 行を FOR UPDATE で掴んで他トランザクションをブロック
--     2) その状態で applied 件数を集計
--     3) 余っていれば INSERT / UPDATE
--   を 1 トランザクションで行うことで、同時応募でも capacity を厳密に守る。
--
-- セキュリティ:
--   SECURITY DEFINER だが auth.uid() を使って呼び出し元の認証ユーザーを縛り、
--   他学生の登録を勝手に作れないようにしている。
-- ============================================================================

CREATE OR REPLACE FUNCTION public.register_for_event(
  p_event_id              UUID,
  p_applicant_name        TEXT DEFAULT NULL,
  p_applicant_email       TEXT DEFAULT NULL,
  p_applicant_affiliation TEXT DEFAULT NULL,
  p_motivation            TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id        UUID := auth.uid();
  v_event          events%ROWTYPE;
  v_existing       event_registrations%ROWTYPE;
  v_applied_count  BIGINT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  -- 1) events 行を排他ロックして取得。
  --    別トランザクションが同じイベントに対して register_for_event を呼んでいる
  --    場合は、ここで COMMIT / ROLLBACK されるまで待つ。
  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_event.is_published IS NOT TRUE
     OR v_event.deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_found');
  END IF;

  -- 2) 締切チェック
  IF v_event.application_deadline IS NOT NULL
     AND now() > v_event.application_deadline THEN
    RETURN jsonb_build_object('ok', false, 'error', 'deadline_passed');
  END IF;

  -- 3) 既存行（キャンセル済み含む）
  SELECT * INTO v_existing
  FROM event_registrations
  WHERE event_id = p_event_id AND student_id = v_user_id;

  IF FOUND AND v_existing.status = 'applied' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_applied');
  END IF;

  -- 4) 定員チェック (1) のロックにより一貫性が担保される
  IF v_event.capacity IS NOT NULL THEN
    SELECT COUNT(*) INTO v_applied_count
    FROM event_registrations
    WHERE event_id = p_event_id AND status = 'applied';

    IF v_applied_count >= v_event.capacity THEN
      RETURN jsonb_build_object('ok', false, 'error', 'capacity_full');
    END IF;
  END IF;

  -- 5) INSERT or UPDATE
  IF FOUND THEN
    -- キャンセル済み行を applied に戻す
    UPDATE event_registrations SET
      status                = 'applied',
      cancelled_at          = NULL,
      applicant_name        = p_applicant_name,
      applicant_email       = p_applicant_email,
      applicant_affiliation = p_applicant_affiliation,
      motivation            = p_motivation
    WHERE id = v_existing.id;
  ELSE
    INSERT INTO event_registrations (
      event_id, student_id, status,
      applicant_name, applicant_email, applicant_affiliation, motivation
    ) VALUES (
      p_event_id, v_user_id, 'applied',
      p_applicant_name, p_applicant_email, p_applicant_affiliation, p_motivation
    );
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.register_for_event(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_for_event(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
