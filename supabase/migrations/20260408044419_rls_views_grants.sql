-- =============================================================
-- Scout Service: RLS Policies, Views, GRANT
-- Based on: docs/development/03-00-schema.md (RLSポリシー方針 / View定義)
-- =============================================================

-- =============================================================
-- 1. Helper functions
-- =============================================================

-- ロール取得: auth.users.raw_app_meta_data.role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT auth.jwt()->'app_metadata'->>'role';
$$ LANGUAGE sql STABLE;

-- 企業ID取得: company_members テーブルから所属企業を引く
-- SECURITY DEFINER: この関数内の SELECT は RLS をバイパスする。
-- get_company_id() → company_members の RLS → get_company_id() の無限再帰を防ぐため必須。
CREATE OR REPLACE FUNCTION public.get_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM company_members WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 所属企業が審査済みかどうか
-- SECURITY DEFINER: get_company_id() 同様、companies の RLS 再帰を防ぐため。
CREATE OR REPLACE FUNCTION public.is_company_verified()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM companies
    WHERE id = public.get_company_id()
    AND is_verified = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =============================================================
-- 2. Enable RLS on all public tables
-- =============================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_product_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_es_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_researches ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_integrated_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_visits ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- 2.5. Revoke anon access to all tables
-- =============================================================
-- Supabase はデフォルトで anon ロールに public スキーマの SELECT 権限を付与している。
-- 本サービスは認証必須のため、anon からの全アクセスを拒否する。
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- =============================================================
-- 3. Views
-- =============================================================

-- public_students: 企業担当者が閲覧できる学生情報（個人特定情報を除外）
-- 行単位のアクセス制御は students テーブルの RLS ポリシー (students_select_company) で行う。
-- View はカラム制限（実名・連絡先の除外）のみ担当。
CREATE VIEW public_students WITH (security_invoker = true) AS
SELECT
  s.id,
  s.university,
  s.faculty,
  s.department,
  s.academic_type,
  s.graduation_year,
  s.prefecture,
  s.profile_image_url,
  s.bio
FROM students s
WHERE s.is_profile_public = true
  AND s.deleted_at IS NULL;

-- searchable_students: 学生検索用（students + student_integrated_profiles JOIN）
CREATE VIEW searchable_students WITH (security_invoker = true) AS
SELECT
  s.id,
  s.university,
  s.faculty,
  s.academic_type,
  s.graduation_year,
  s.prefecture,
  s.profile_image_url,
  s.bio,
  sip.summary,
  sip.strengths,
  sip.interests,
  sip.skills,
  sip.preferred_work_locations,
  sip.activity_level
FROM students s
LEFT JOIN student_integrated_profiles sip ON s.id = sip.student_id
WHERE s.is_profile_public = true
  AND s.deleted_at IS NULL;

-- =============================================================
-- 4. RLS Policies — students
-- =============================================================

-- 学生: 自分のレコードのみ
CREATE POLICY students_select_own ON students
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY students_insert_own ON students
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY students_update_own ON students
  FOR UPDATE USING (auth.uid() = id);

-- 企業担当者: 審査済み企業のみ、以下2パターンで閲覧可
--   1) View経由（検索時）: 公開プロフィールの学生のみ。Viewがカラム制限（実名・連絡先除外）
--   2) 直接アクセス（承諾後）: 承諾済みスカウトの学生のみ。全カラム閲覧可（実名・連絡先含む）
CREATE POLICY students_select_company ON students
  FOR SELECT USING (
    get_user_role() IN ('company_owner', 'company_member')
    AND is_company_verified()
    AND (
      (is_profile_public = true AND deleted_at IS NULL)
      OR
      EXISTS (
        SELECT 1 FROM scouts
        WHERE scouts.student_id = students.id
        AND scouts.company_id = get_company_id()
        AND scouts.status = 'accepted'
      )
    )
  );

-- =============================================================
-- 5. RLS Policies — companies
-- =============================================================

-- 学生: is_public = true の企業のみ
CREATE POLICY companies_select_student ON companies
  FOR SELECT USING (
    get_user_role() = 'student' AND is_public = true
  );

-- 企業担当者: 自社のみ閲覧
CREATE POLICY companies_select_company ON companies
  FOR SELECT USING (
    get_user_role() IN ('company_owner', 'company_member')
    AND id = get_company_id()
  );

-- 企業 owner: 自社のみ更新
CREATE POLICY companies_update_owner ON companies
  FOR UPDATE USING (
    get_user_role() = 'company_owner'
    AND id = get_company_id()
  );

-- =============================================================
-- 6. RLS Policies — company_members
-- =============================================================

-- 企業担当者: 自社メンバーのみ閲覧
CREATE POLICY company_members_select ON company_members
  FOR SELECT USING (
    company_id = get_company_id()
  );

-- owner のみ追加・更新・削除
CREATE POLICY company_members_insert_owner ON company_members
  FOR INSERT WITH CHECK (
    get_user_role() = 'company_owner'
    AND company_id = get_company_id()
  );

CREATE POLICY company_members_update_owner ON company_members
  FOR UPDATE USING (
    get_user_role() = 'company_owner'
    AND company_id = get_company_id()
  );

CREATE POLICY company_members_delete_owner ON company_members
  FOR DELETE USING (
    get_user_role() = 'company_owner'
    AND company_id = get_company_id()
  );

-- =============================================================
-- 7. RLS Policies — student_product_links
-- =============================================================

-- 学生: 自分のリンクのみ閲覧
CREATE POLICY student_product_links_select ON student_product_links
  FOR SELECT USING (auth.uid() = student_id);

-- =============================================================
-- 8. RLS Policies — synced_* (4テーブル共通パターン)
-- =============================================================

-- synced_es_entries
CREATE POLICY synced_es_entries_select ON synced_es_entries
  FOR SELECT USING (auth.uid() = student_id);

-- synced_researches
CREATE POLICY synced_researches_select ON synced_researches
  FOR SELECT USING (auth.uid() = student_id);

-- synced_interview_sessions
CREATE POLICY synced_interview_sessions_select ON synced_interview_sessions
  FOR SELECT USING (auth.uid() = student_id);

-- synced_activities
CREATE POLICY synced_activities_select ON synced_activities
  FOR SELECT USING (auth.uid() = student_id);

-- =============================================================
-- 9. RLS Policies — student_integrated_profiles
-- =============================================================

-- 学生: 自分のレコードのみ
CREATE POLICY student_integrated_profiles_select ON student_integrated_profiles
  FOR SELECT USING (auth.uid() = student_id);

-- 企業担当者: 公開学生のプロフィールのみ閲覧可（searchable_students View の JOIN で使用）
CREATE POLICY student_integrated_profiles_select_company ON student_integrated_profiles
  FOR SELECT USING (
    get_user_role() IN ('company_owner', 'company_member')
    AND is_company_verified()
    AND EXISTS (
      SELECT 1 FROM students
      WHERE students.id = student_integrated_profiles.student_id
      AND students.is_profile_public = true
      AND students.deleted_at IS NULL
    )
  );

-- =============================================================
-- 10. RLS Policies — job_postings
-- =============================================================

-- 学生: 公開中 かつ 企業が is_public = true
CREATE POLICY job_postings_select_student ON job_postings
  FOR SELECT USING (
    get_user_role() = 'student'
    AND is_published = true
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = job_postings.company_id
      AND companies.is_public = true
    )
  );

-- 企業担当者: 自社の全求人
CREATE POLICY job_postings_select_company ON job_postings
  FOR SELECT USING (
    company_id = get_company_id()
  );

-- 企業担当者: 自社メンバーが作成（審査済み企業のみ）
CREATE POLICY job_postings_insert_company ON job_postings
  FOR INSERT WITH CHECK (
    company_id = get_company_id()
    AND is_company_verified()
  );

-- 企業担当者: 自社の求人のみ更新
CREATE POLICY job_postings_update_company ON job_postings
  FOR UPDATE USING (
    company_id = get_company_id()
  );

-- =============================================================
-- 11. RLS Policies — scouts
-- =============================================================

-- 学生: 自分宛のみ閲覧
CREATE POLICY scouts_select_student ON scouts
  FOR SELECT USING (
    get_user_role() = 'student'
    AND student_id = auth.uid()
  );

-- 学生: status, read_at, responded_at のみ更新（GRANT で制限）
CREATE POLICY scouts_update_student ON scouts
  FOR UPDATE USING (
    get_user_role() = 'student'
    AND student_id = auth.uid()
  );

-- 企業担当者: 自社のスカウトのみ閲覧
CREATE POLICY scouts_select_company ON scouts
  FOR SELECT USING (
    company_id = get_company_id()
  );

-- 企業担当者: 自社として送信（審査済み企業のみ）
CREATE POLICY scouts_insert_company ON scouts
  FOR INSERT WITH CHECK (
    company_id = get_company_id()
    AND is_company_verified()
  );

-- 企業担当者: 自社のスカウトのみ更新
CREATE POLICY scouts_update_company ON scouts
  FOR UPDATE USING (
    company_id = get_company_id()
  );

-- =============================================================
-- 12. RLS Policies — saved_searches
-- =============================================================

CREATE POLICY saved_searches_select ON saved_searches
  FOR SELECT USING (company_member_id = auth.uid());

CREATE POLICY saved_searches_insert ON saved_searches
  FOR INSERT WITH CHECK (company_member_id = auth.uid());

CREATE POLICY saved_searches_update ON saved_searches
  FOR UPDATE USING (company_member_id = auth.uid());

CREATE POLICY saved_searches_delete ON saved_searches
  FOR DELETE USING (company_member_id = auth.uid());

-- =============================================================
-- 13. RLS Policies — company_plans
-- =============================================================

-- 企業担当者: 自社のプランのみ閲覧
CREATE POLICY company_plans_select ON company_plans
  FOR SELECT USING (company_id = get_company_id());

-- =============================================================
-- 14. RLS Policies — chat_messages
-- =============================================================

-- 学生: 自分が当事者のスカウトのチャットのみ
CREATE POLICY chat_messages_select_student ON chat_messages
  FOR SELECT USING (
    get_user_role() = 'student'
    AND EXISTS (
      SELECT 1 FROM scouts
      WHERE scouts.id = chat_messages.scout_id
      AND scouts.student_id = auth.uid()
    )
  );

-- 学生: スカウト当事者かつ accepted のみ送信
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

-- 企業担当者: 自社が当事者のスカウトのチャットのみ
CREATE POLICY chat_messages_select_company ON chat_messages
  FOR SELECT USING (
    get_user_role() IN ('company_owner', 'company_member')
    AND EXISTS (
      SELECT 1 FROM scouts
      WHERE scouts.id = chat_messages.scout_id
      AND scouts.company_id = get_company_id()
    )
  );

-- 企業担当者: スカウト当事者かつ accepted のみ送信
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

-- read_at の更新: 相手側が更新可能
CREATE POLICY chat_messages_update_read ON chat_messages
  FOR UPDATE USING (
    sender_id != auth.uid()
    AND (
      (get_user_role() = 'student' AND EXISTS (
        SELECT 1 FROM scouts WHERE scouts.id = chat_messages.scout_id AND scouts.student_id = auth.uid()
      ))
      OR
      (get_user_role() IN ('company_owner', 'company_member') AND EXISTS (
        SELECT 1 FROM scouts WHERE scouts.id = chat_messages.scout_id AND scouts.company_id = get_company_id()
      ))
    )
  );

-- =============================================================
-- 15. RLS Policies — notifications
-- =============================================================

-- 自分宛のみ閲覧
CREATE POLICY notifications_select ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- INSERT はクライアントからは不可（Service Role のみ）
-- → ポリシーを作らないことで拒否

-- is_read, read_at のみ更新（GRANT で制限）
CREATE POLICY notifications_update ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- =============================================================
-- 16. RLS Policies — student_notification_settings
-- =============================================================

CREATE POLICY student_notification_settings_select ON student_notification_settings
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY student_notification_settings_insert ON student_notification_settings
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY student_notification_settings_update ON student_notification_settings
  FOR UPDATE USING (student_id = auth.uid());

-- =============================================================
-- 17. RLS Policies — company_notification_settings
-- =============================================================

CREATE POLICY company_notification_settings_select ON company_notification_settings
  FOR SELECT USING (company_member_id = auth.uid());

CREATE POLICY company_notification_settings_insert ON company_notification_settings
  FOR INSERT WITH CHECK (company_member_id = auth.uid());

CREATE POLICY company_notification_settings_update ON company_notification_settings
  FOR UPDATE USING (company_member_id = auth.uid());

-- =============================================================
-- 18. RLS Policies — events
-- =============================================================

-- 学生: 公開イベント かつ 企業主催の場合は is_public = true
CREATE POLICY events_select_student ON events
  FOR SELECT USING (
    get_user_role() = 'student'
    AND is_published = true
    AND deleted_at IS NULL
    AND (
      organizer_type = 'platform'
      OR EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = events.company_id
        AND companies.is_public = true
      )
    )
  );

-- 企業担当者: 自社イベント + 公開中の運営イベント
CREATE POLICY events_select_company ON events
  FOR SELECT USING (
    get_user_role() IN ('company_owner', 'company_member')
    AND (
      company_id = get_company_id()
      OR (organizer_type = 'platform' AND is_published = true AND deleted_at IS NULL)
    )
  );

-- 企業担当者: 自社メンバーが作成（審査済み企業のみ）
CREATE POLICY events_insert_company ON events
  FOR INSERT WITH CHECK (
    company_id = get_company_id()
    AND is_company_verified()
  );

-- 企業担当者: 自社のイベントのみ更新
CREATE POLICY events_update_company ON events
  FOR UPDATE USING (
    company_id = get_company_id()
  );

-- =============================================================
-- 19. RLS Policies — event_registrations
-- =============================================================

-- 学生: 自分の申し込みのみ閲覧
CREATE POLICY event_registrations_select_student ON event_registrations
  FOR SELECT USING (
    get_user_role() = 'student'
    AND student_id = auth.uid()
  );

-- 学生: 公開イベントに申し込み
CREATE POLICY event_registrations_insert_student ON event_registrations
  FOR INSERT WITH CHECK (
    get_user_role() = 'student'
    AND student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_registrations.event_id
      AND events.is_published = true
      AND events.deleted_at IS NULL
    )
  );

-- 学生: status のみ更新（キャンセル）
CREATE POLICY event_registrations_update_student ON event_registrations
  FOR UPDATE USING (
    get_user_role() = 'student'
    AND student_id = auth.uid()
  );

-- 企業担当者: 自社イベントの申し込み一覧
CREATE POLICY event_registrations_select_company ON event_registrations
  FOR SELECT USING (
    get_user_role() IN ('company_owner', 'company_member')
    AND EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_registrations.event_id
      AND events.company_id = get_company_id()
    )
  );

-- 企業担当者: status のみ更新（確認・出席記録）
CREATE POLICY event_registrations_update_company ON event_registrations
  FOR UPDATE USING (
    get_user_role() IN ('company_owner', 'company_member')
    AND EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_registrations.event_id
      AND events.company_id = get_company_id()
    )
  );

-- =============================================================
-- 20. RLS Policies — anonymous_visits
-- =============================================================

-- クライアントからのアクセスを全拒否（Service Role のみ）
CREATE POLICY anonymous_visits_deny_all ON anonymous_visits
  USING (false);

-- =============================================================
-- 21. GRANT — カラム単位の UPDATE 制限
-- =============================================================

-- scouts: 学生は status, read_at, responded_at のみ更新可能
REVOKE UPDATE ON scouts FROM authenticated;
GRANT UPDATE (status, read_at, responded_at) ON scouts TO authenticated;

-- notifications: is_read, read_at のみ更新可能
REVOKE UPDATE ON notifications FROM authenticated;
GRANT UPDATE (is_read, read_at) ON notifications TO authenticated;

-- chat_messages: read_at のみ更新可能
REVOKE UPDATE ON chat_messages FROM authenticated;
GRANT UPDATE (read_at) ON chat_messages TO authenticated;

-- event_registrations: status, cancelled_at のみ更新可能
REVOKE UPDATE ON event_registrations FROM authenticated;
GRANT UPDATE (status, cancelled_at) ON event_registrations TO authenticated;
