-- =============================================================
-- スカウト送信の競合状態対策
--
-- 1. scouts テーブルに UNIQUE 制約を追加（同じ企業×学生×求人の重複防止）
-- 2. company_plans のスカウト送信カウントをアトミックに更新するRPC
-- =============================================================

-- 1. 重複防止の UNIQUE 制約
ALTER TABLE scouts
  ADD CONSTRAINT scouts_company_student_job_unique
  UNIQUE (company_id, student_id, job_posting_id);

-- 2. アトミックなスカウト送信カウント更新
--    上限チェック + インクリメントを1トランザクションで行う
CREATE OR REPLACE FUNCTION increment_scouts_sent(
  p_company_id UUID,
  p_count INT,
  p_limit INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current INT;
  v_remaining INT;
BEGIN
  -- 排他ロックで読み取り（他のトランザクションが同時に更新するのを防ぐ）
  SELECT COALESCE(scouts_sent_this_month, 0)
    INTO v_current
    FROM company_plans
    WHERE company_id = p_company_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'plan_not_found');
  END IF;

  v_remaining := p_limit - v_current;

  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'limit_reached', 'remaining', 0);
  END IF;

  IF p_count > v_remaining THEN
    RETURN jsonb_build_object('success', false, 'error', 'limit_exceeded', 'remaining', v_remaining);
  END IF;

  UPDATE company_plans
    SET scouts_sent_this_month = v_current + p_count,
        updated_at = now()
    WHERE company_id = p_company_id;

  RETURN jsonb_build_object('success', true, 'remaining', v_remaining - p_count);
END;
$$;
