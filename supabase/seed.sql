-- =============================================================
-- Seed Data for RLS Testing
-- =============================================================
-- テストユーザー:
--   学生A: 11111111-...-111111111111 (student)
--   学生B: 22222222-...-222222222222 (student)
--   企業owner: 33333333-...-333333333333 (company_owner) → 審査済み企業
--   企業member: 44444444-...-444444444444 (company_member) → 審査済み企業
--   未審査企業owner: 55555555-...-555555555555 (company_owner) → 未審査企業
-- =============================================================

-- ----- auth.users -----
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change_token_current)
VALUES
  -- 学生A
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-a@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"], "role": "student"}', '{}', now(), now(), '', '', '', ''),
  -- 学生B
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-b@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"], "role": "student"}', '{}', now(), now(), '', '', '', ''),
  -- 審査済み企業 owner
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@verified-corp.com', crypt('password123', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"], "role": "company_owner"}', '{}', now(), now(), '', '', '', ''),
  -- 審査済み企業 member
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member@verified-corp.com', crypt('password123', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"], "role": "company_member"}', '{}', now(), now(), '', '', '', ''),
  -- 未審査企業 owner
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@unverified-corp.com', crypt('password123', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"], "role": "company_owner"}', '{}', now(), now(), '', '', '', '');

-- ----- auth.identities (Supabase Auth が要求) -----
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '{"sub": "11111111-1111-1111-1111-111111111111", "email": "student-a@test.com"}', 'email', now(), now(), now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '{"sub": "22222222-2222-2222-2222-222222222222", "email": "student-b@test.com"}', 'email', now(), now(), now()),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '{"sub": "33333333-3333-3333-3333-333333333333", "email": "owner@verified-corp.com"}', 'email', now(), now(), now()),
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '{"sub": "44444444-4444-4444-4444-444444444444", "email": "member@verified-corp.com"}', 'email', now(), now(), now()),
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', '{"sub": "55555555-5555-5555-5555-555555555555", "email": "owner@unverified-corp.com"}', 'email', now(), now(), now());

-- ----- companies -----
INSERT INTO companies (id, name, industry, is_verified, verified_at, created_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '審査済み株式会社', 'IT', true, now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '未審査株式会社', 'メーカー', false, NULL, now());

-- ----- students -----
INSERT INTO students (id, email, last_name, first_name, university, faculty, academic_type, graduation_year, prefecture, is_profile_public, bio, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'student-a@test.com', '田中', '太郎', '東京大学', '工学部', 'science', 2027, '東京都', true, '機械学習に興味があります', now()),
  ('22222222-2222-2222-2222-222222222222', 'student-b@test.com', '佐藤', '花子', '京都大学', '文学部', 'liberal_arts', 2027, '京都府', false, '日本文学を研究中', now());

-- ----- company_members -----
INSERT INTO company_members (id, company_id, email, last_name, first_name, role, is_active, created_at)
VALUES
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner@verified-corp.com', '鈴木', '一郎', 'owner', true, now()),
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'member@verified-corp.com', '高橋', '次郎', 'member', true, now()),
  ('55555555-5555-5555-5555-555555555555', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'owner@unverified-corp.com', '伊藤', '三郎', 'owner', true, now());

-- ----- student_product_links (学生Aのみ) -----
INSERT INTO student_product_links (student_id, product, external_user_id, linked_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'smartes', 'ext-user-001', now());

-- ----- synced_es_entries (学生Aのみ) -----
INSERT INTO synced_es_entries (student_id, company_name, industry, question_content, answer, synced_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'テスト商事', 'IT', '志望動機を教えてください', 'AIで社会課題を解決したい', now());

-- ----- synced_researches (学生Aのみ) -----
INSERT INTO synced_researches (student_id, title, content, synced_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'テスト商事の企業分析', 'IT企業の分析結果', now());

-- ----- synced_interview_sessions (学生Aのみ) -----
INSERT INTO synced_interview_sessions (student_id, session_type, summary, synced_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '個人面接', '論理的に回答できていた', now());

-- ----- synced_activities (学生Aのみ) -----
INSERT INTO synced_activities (student_id, event_name, applied_at, synced_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'テスト商事 夏インターン', now(), now());

-- ----- student_integrated_profiles (学生Aのみ) -----
INSERT INTO student_integrated_profiles (student_id, summary, strengths, interests, skills, preferred_work_locations, activity_level, generated_at, model_version)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'AI技術に関心が高く行動力のある学生', '["論理的思考", "プログラミング"]', '["IT", "AI"]', '["Python", "機械学習"]', '["東京", "大阪"]', 'active', now(), 'claude-sonnet-4-20250514');

-- ----- job_postings -----
INSERT INTO job_postings (id, company_id, created_by, title, description, job_category, is_published, published_at, created_at)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', '26卒 エンジニア職', 'バックエンドエンジニア募集', 'エンジニア', true, now(), now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', '26卒 営業職（非公開）', '営業職募集', '営業', false, NULL, now());

-- ----- scouts -----
INSERT INTO scouts (id, company_id, sender_id, student_id, job_posting_id, subject, message, status, sent_at)
VALUES
  -- 審査済み企業 → 学生A (accepted)
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'エンジニア職のご案内', 'ぜひお話させてください', 'accepted', now()),
  -- 審査済み企業 → 学生B (sent)
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '営業職のご案内', '興味があればご連絡ください', 'sent', now());

-- ----- chat_messages (accepted スカウトのみ) -----
INSERT INTO chat_messages (scout_id, sender_id, sender_role, content, created_at)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', 'company_member', 'スカウトを承諾いただきありがとうございます！', now()),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'student', 'ありがとうございます。ぜひお話したいです。', now());

-- ----- notifications -----
INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'scout_received', 'スカウトが届きました', '審査済み株式会社からスカウトが届きました', 'scouts', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', now()),
  ('33333333-3333-3333-3333-333333333333', 'scout_accepted', 'スカウトが承諾されました', '田中太郎さんがスカウトを承諾しました', 'scouts', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', now());

-- ----- student_notification_settings -----
INSERT INTO student_notification_settings (student_id, scout_received, chat_message, line_enabled, in_app_enabled)
VALUES
  ('11111111-1111-1111-1111-111111111111', true, true, true, true),
  ('22222222-2222-2222-2222-222222222222', true, true, true, true);

-- ----- company_notification_settings -----
INSERT INTO company_notification_settings (company_member_id, scout_accepted, chat_message, line_enabled, in_app_enabled)
VALUES
  ('33333333-3333-3333-3333-333333333333', true, true, true, true);

-- ----- events -----
INSERT INTO events (id, company_id, created_by, organizer_type, title, description, format, starts_at, is_published, published_at, created_at)
VALUES
  -- 審査済み企業の公開イベント
  ('99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'company', '会社説明会', 'エンジニア向け会社説明会', 'online', now() + interval '7 days', true, now(), now()),
  -- 運営主催の公開イベント
  ('88888888-8888-8888-8888-888888888888', NULL, NULL, 'platform', '合同企業説明会', '運営主催の合同説明会', 'offline', now() + interval '14 days', true, now(), now());

-- ----- event_registrations -----
INSERT INTO event_registrations (event_id, student_id, status, applied_at)
VALUES
  ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'applied', now());

-- ----- company_plans -----
INSERT INTO company_plans (company_id, plan_type, scout_quota, scouts_sent_this_month)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'basic', 30, 5);

-- ----- saved_searches -----
INSERT INTO saved_searches (id, company_member_id, name, filters, created_at)
VALUES
  ('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'エンジニア候補', '{"academic_type": "science", "graduation_year": 2027}', now());

-- ----- anonymous_visits -----
INSERT INTO anonymous_visits (session_token, utm_source, landing_page, created_at)
VALUES
  ('test-session-token-001', 'google', '/', now());
