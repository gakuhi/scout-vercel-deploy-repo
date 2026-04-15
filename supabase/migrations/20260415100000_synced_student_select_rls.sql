-- =============================================================
-- synced_* テーブルに学生 SELECT RLS ポリシーを追加
-- student_product_links 経由で自分の external_user_id に紐づくレコードのみ閲覧可
-- =============================================================

-- =============================================================
-- 1. 面接練習AI（interviewai）
-- =============================================================

CREATE POLICY synced_interviewai_users_select_student ON synced_interviewai_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_product_links
      WHERE student_product_links.student_id = auth.uid()
        AND student_product_links.product = 'interviewai'
        AND student_product_links.external_user_id = synced_interviewai_users.external_user_id
    )
  );

CREATE POLICY synced_interviewai_sessions_select_student ON synced_interviewai_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_product_links
      WHERE student_product_links.student_id = auth.uid()
        AND student_product_links.product = 'interviewai'
        AND student_product_links.external_user_id = synced_interviewai_sessions.external_user_id
    )
  );

CREATE POLICY synced_interviewai_searches_select_student ON synced_interviewai_searches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_product_links
      WHERE student_product_links.student_id = auth.uid()
        AND student_product_links.product = 'interviewai'
        AND student_product_links.external_user_id = synced_interviewai_searches.external_user_id
    )
  );

-- =============================================================
-- 2. 企業分析AI（compai）
-- =============================================================

CREATE POLICY synced_compai_users_select_student ON synced_compai_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_product_links
      WHERE student_product_links.student_id = auth.uid()
        AND student_product_links.product = 'compai'
        AND student_product_links.external_user_id = synced_compai_users.external_user_id
    )
  );

CREATE POLICY synced_compai_researches_select_student ON synced_compai_researches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_product_links
      WHERE student_product_links.student_id = auth.uid()
        AND student_product_links.product = 'compai'
        AND student_product_links.external_user_id = synced_compai_researches.external_user_id
    )
  );

CREATE POLICY synced_compai_messages_select_student ON synced_compai_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_product_links
      WHERE student_product_links.student_id = auth.uid()
        AND student_product_links.product = 'compai'
        AND student_product_links.external_user_id = synced_compai_messages.external_user_id
    )
  );

-- =============================================================
-- 3. スマートES（smartes）
-- =============================================================

CREATE POLICY synced_smartes_users_select_student ON synced_smartes_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_product_links
      WHERE student_product_links.student_id = auth.uid()
        AND student_product_links.product = 'smartes'
        AND student_product_links.external_user_id = synced_smartes_users.external_user_id
    )
  );

CREATE POLICY synced_smartes_motivations_select_student ON synced_smartes_motivations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_product_links
      WHERE student_product_links.student_id = auth.uid()
        AND student_product_links.product = 'smartes'
        AND student_product_links.external_user_id = synced_smartes_motivations.external_user_id
    )
  );

CREATE POLICY synced_smartes_gakuchika_select_student ON synced_smartes_gakuchika
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_product_links
      WHERE student_product_links.student_id = auth.uid()
        AND student_product_links.product = 'smartes'
        AND student_product_links.external_user_id = synced_smartes_gakuchika.external_user_id
    )
  );

CREATE POLICY synced_smartes_generated_es_select_student ON synced_smartes_generated_es
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_product_links
      WHERE student_product_links.student_id = auth.uid()
        AND student_product_links.product = 'smartes'
        AND student_product_links.external_user_id = synced_smartes_generated_es.external_user_id
    )
  );

-- =============================================================
-- 4. すごい就活（sugoshu）
-- =============================================================

CREATE POLICY synced_sugoshu_users_select_student ON synced_sugoshu_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_product_links
      WHERE student_product_links.student_id = auth.uid()
        AND student_product_links.product = 'sugoshu'
        AND student_product_links.external_user_id = synced_sugoshu_users.external_user_id
    )
  );

CREATE POLICY synced_sugoshu_resumes_select_student ON synced_sugoshu_resumes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_product_links
      WHERE student_product_links.student_id = auth.uid()
        AND student_product_links.product = 'sugoshu'
        AND student_product_links.external_user_id = synced_sugoshu_resumes.external_user_id
    )
  );

CREATE POLICY synced_sugoshu_diagnoses_select_student ON synced_sugoshu_diagnoses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_product_links
      WHERE student_product_links.student_id = auth.uid()
        AND student_product_links.product = 'sugoshu'
        AND student_product_links.external_user_id = synced_sugoshu_diagnoses.external_user_id
    )
  );
