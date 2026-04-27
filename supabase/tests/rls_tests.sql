-- =============================================================
-- RLS Test Cases (104 items)
-- Based on: docs/development/03-01-rls-test-checklist.md
-- =============================================================
-- Usage: supabase db reset && docker exec -i <container> psql -U postgres -d postgres < supabase/tests/rls_tests.sql > supabase/tests/rls_test_results.txt 2>&1
--
-- テストユーザー:
--   学生A: 11111111-...-111111111111 (student, プロフィール公開)
--   学生B: 22222222-...-222222222222 (student, プロフィール非公開)
--   審査済み企業 owner: 33333333-...-333333333333 (company_owner)
--   審査済み企業 member: 44444444-...-444444444444 (company_member)
--   未審査企業 owner: 55555555-...-555555555555 (company_owner)
-- =============================================================

-- =============================================================
-- 1. 学生の自分データ保護
-- =============================================================

-- 1-1: 学生Aが自分のプロフィールを閲覧 (期待: 1行 田中)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 1-1: 学生A → students SELECT (1行) ===' AS test;
SELECT id, last_name FROM students;
RESET ROLE;

-- 1-2: 学生Aが学生Bのプロフィールを閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 1-2: 学生A → students WHERE 学生B (0行) ===' AS test;
SELECT id, last_name FROM students WHERE id = '22222222-2222-2222-2222-222222222222';
RESET ROLE;

-- 1-3: 学生Aが自分のプロフィールを更新 (期待: UPDATE 1)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 1-3: 学生A → students UPDATE 自分 (UPDATE 1) ===' AS test;
UPDATE students SET bio = 'updated bio' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE students SET bio = '機械学習に興味があります' WHERE id = '11111111-1111-1111-1111-111111111111';
RESET ROLE;

-- 1-4: 学生Aが学生Bのプロフィールを更新できない (期待: UPDATE 0)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 1-4: 学生A → students UPDATE 学生B (UPDATE 0) ===' AS test;
UPDATE students SET bio = 'hacked' WHERE id = '22222222-2222-2222-2222-222222222222';
RESET ROLE;

-- =============================================================
-- 2. 連携データ・AIプロフィールの保護
-- =============================================================

-- 2-1: 学生Aが自分のESデータを閲覧 (期待: 1行)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 2-1: 学生A → synced_es_entries (1行) ===' AS test;
SELECT id, company_name FROM synced_es_entries;
RESET ROLE;

-- 2-2: 学生Bが学生AのESデータを閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 2-2: 学生B → synced_es_entries (0行) ===' AS test;
SELECT id FROM synced_es_entries;
RESET ROLE;

-- 2-3: 学生Aが自分の企業分析データを閲覧 (期待: 1行)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 2-3: 学生A → synced_researches (1行) ===' AS test;
SELECT id, title FROM synced_researches;
RESET ROLE;

-- 2-4: 学生Bが学生Aの企業分析データを閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 2-4: 学生B → synced_researches (0行) ===' AS test;
SELECT id FROM synced_researches;
RESET ROLE;

-- 2-5: 学生Aが自分の面接練習データを閲覧 (期待: 1行)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 2-5: 学生A → synced_interview_sessions (1行) ===' AS test;
SELECT id, session_type FROM synced_interview_sessions;
RESET ROLE;

-- 2-6: 学生Bが学生Aの面接練習データを閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 2-6: 学生B → synced_interview_sessions (0行) ===' AS test;
SELECT id FROM synced_interview_sessions;
RESET ROLE;

-- 2-7: 学生Aが自分の就活活動データを閲覧 (期待: 1行)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 2-7: 学生A → synced_activities (1行) ===' AS test;
SELECT id, event_name FROM synced_activities;
RESET ROLE;

-- 2-8: 学生Bが学生Aの就活活動データを閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 2-8: 学生B → synced_activities (0行) ===' AS test;
SELECT id FROM synced_activities;
RESET ROLE;

-- 2-9: 学生Aが自分のAIプロフィールを閲覧 (期待: 1行)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 2-9: 学生A → student_integrated_profiles (1行) ===' AS test;
SELECT id, summary FROM student_integrated_profiles;
RESET ROLE;

-- 2-10: 学生AがESデータをINSERTできない (期待: ERROR)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 2-10: 学生A → synced_es_entries INSERT (ERROR) ===' AS test;
INSERT INTO synced_es_entries (student_id, company_name) VALUES ('11111111-1111-1111-1111-111111111111', 'test');
RESET ROLE;

-- 2-11: 学生Aが企業分析データをINSERTできない (期待: ERROR)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 2-11: 学生A → synced_researches INSERT (ERROR) ===' AS test;
INSERT INTO synced_researches (student_id, title) VALUES ('11111111-1111-1111-1111-111111111111', 'test');
RESET ROLE;

-- 2-12: 学生Aが面接練習データをINSERTできない (期待: ERROR)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 2-12: 学生A → synced_interview_sessions INSERT (ERROR) ===' AS test;
INSERT INTO synced_interview_sessions (student_id, session_type) VALUES ('11111111-1111-1111-1111-111111111111', 'test');
RESET ROLE;

-- 2-13: 学生Aが就活活動データをINSERTできない (期待: ERROR)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 2-13: 学生A → synced_activities INSERT (ERROR) ===' AS test;
INSERT INTO synced_activities (student_id, event_name) VALUES ('11111111-1111-1111-1111-111111111111', 'test');
RESET ROLE;

-- 2-14: 学生AがAIプロフィールをUPDATEできない (期待: UPDATE 0)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 2-14: 学生A → student_integrated_profiles UPDATE (UPDATE 0) ===' AS test;
UPDATE student_integrated_profiles SET summary = 'hacked' WHERE student_id = '11111111-1111-1111-1111-111111111111';
RESET ROLE;

-- 2-15: 企業担当者が synced_es_entries に直接アクセスできない (期待: 0行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 2-15: 企業owner → synced_es_entries (0行) ===' AS test;
SELECT id FROM synced_es_entries;
RESET ROLE;

-- 2-16: 企業担当者が synced_researches に直接アクセスできない (期待: 0行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 2-16: 企業owner → synced_researches (0行) ===' AS test;
SELECT id FROM synced_researches;
RESET ROLE;

-- 2-17: 企業担当者が synced_interview_sessions に直接アクセスできない (期待: 0行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 2-17: 企業owner → synced_interview_sessions (0行) ===' AS test;
SELECT id FROM synced_interview_sessions;
RESET ROLE;

-- 2-18: 企業担当者が synced_activities に直接アクセスできない (期待: 0行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 2-18: 企業owner → synced_activities (0行) ===' AS test;
SELECT id FROM synced_activities;
RESET ROLE;

-- 2-19: 企業担当者がstudent_integrated_profilesに直接アクセス (期待: 公開学生のみ 1行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 2-19: 企業owner → student_integrated_profiles (公開学生のみ 1行) ===' AS test;
SELECT id, summary FROM student_integrated_profiles;
RESET ROLE;

-- =============================================================
-- 2b. プロダクト紐付けの保護
-- =============================================================

-- 2b-1: 学生Aが自分のプロダクト紐付けを閲覧 (期待: 1行)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 2b-1: 学生A → student_product_links (1行) ===' AS test;
SELECT id, product FROM student_product_links;
RESET ROLE;

-- 2b-2: 学生Bが学生Aのプロダクト紐付けを閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 2b-2: 学生B → student_product_links (0行) ===' AS test;
SELECT id FROM student_product_links;
RESET ROLE;

-- 2b-3: 学生AがプロダクトリンクをINSERTできない (期待: ERROR)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 2b-3: 学生A → student_product_links INSERT (ERROR) ===' AS test;
INSERT INTO student_product_links (student_id, product, external_user_id) VALUES ('11111111-1111-1111-1111-111111111111', 'company_ai', 'ext-hack');
RESET ROLE;

-- 2b-4: 企業担当者がプロダクト紐付けを閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 2b-4: 企業owner → student_product_links (0行) ===' AS test;
SELECT id FROM student_product_links;
RESET ROLE;

-- =============================================================
-- 3. 企業情報の公開制御
-- =============================================================

-- 3-1: 学生Aが公開企業のみ閲覧できる (期待: 1行 審査済み株式会社)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 3-1: 学生A → companies (公開のみ 1行) ===' AS test;
SELECT id, name, is_public FROM companies;
RESET ROLE;

-- 3-2: 学生Aが非公開企業を閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 3-2: 学生A → companies WHERE 未審査 (0行) ===' AS test;
SELECT id FROM companies WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
RESET ROLE;

-- 3-3: 企業担当者が自社のみ閲覧できる (期待: 1行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 3-3: 企業owner → companies (自社のみ 1行) ===' AS test;
SELECT id, name FROM companies;
RESET ROLE;

-- 3-7: 企業担当者が他社を閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 3-7: 企業owner → companies WHERE 他社 (0行) ===' AS test;
SELECT id FROM companies WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
RESET ROLE;

-- 3-4: 企業ownerが自社情報を更新できる (期待: UPDATE 1)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 3-4: 企業owner → companies UPDATE 自社 (UPDATE 1) ===' AS test;
UPDATE companies SET description = 'updated' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
UPDATE companies SET description = NULL WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
RESET ROLE;

-- 3-5: 企業memberが自社情報を更新できない (期待: UPDATE 0)
SET request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
SET request.jwt.claims = '{"app_metadata": {"role": "company_member"}}';
SET ROLE authenticated;
SELECT '=== 3-5: 企業member → companies UPDATE (UPDATE 0) ===' AS test;
UPDATE companies SET description = 'hacked' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
RESET ROLE;

-- 3-6: 企業ownerが他社情報を更新できない (期待: UPDATE 0)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 3-6: 企業owner → companies UPDATE 他社 (UPDATE 0) ===' AS test;
UPDATE companies SET description = 'hacked' WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
RESET ROLE;

-- =============================================================
-- 4. 求人の公開制御
-- =============================================================

-- 4-1: 学生が公開求人を閲覧できる (期待: 1行 26卒エンジニア職)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 4-1: 学生A → job_postings (公開のみ 1行) ===' AS test;
SELECT id, title, is_published FROM job_postings;
RESET ROLE;

-- 4-2: 学生が非公開求人を閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 4-2: 学生A → job_postings WHERE 非公開 (0行) ===' AS test;
SELECT id FROM job_postings WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
RESET ROLE;

-- 4-3: (4-1で間接確認 — 非公開企業の求人は含まれない)
SELECT '=== 4-3: (4-1で間接確認済み) ===' AS test;

-- 4-4: 企業担当者が自社の全求人（非公開含む）を閲覧できる (期待: 2行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 4-4: 企業owner → job_postings (自社全件 2行) ===' AS test;
SELECT id, title, is_published FROM job_postings;
RESET ROLE;

-- 4-5: (4-4で確認済み — 他社の求人は含まれない)
SELECT '=== 4-5: (4-4で確認済み) ===' AS test;

-- 4-6a: 審査済み企業が求人を作成できる (期待: INSERT 0 1)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 4-6a: 審査済み企業 → job_postings INSERT (INSERT 0 1) ===' AS test;
INSERT INTO job_postings (company_id, created_by, title, description) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'テスト求人', 'テスト');
RESET ROLE;

-- 4-6b: 未審査企業が求人を作成できない (期待: ERROR)
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 4-6b: 未審査企業 → job_postings INSERT (ERROR) ===' AS test;
INSERT INTO job_postings (company_id, created_by, title, description) VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'テスト', 'テスト');
RESET ROLE;

-- =============================================================
-- 5. スカウトの送信・閲覧制御
-- =============================================================

-- 5-1: 学生Aが自分宛のスカウトを閲覧 (期待: 1行 accepted)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 5-1: 学生A → scouts (自分宛のみ 1行) ===' AS test;
SELECT id, subject, status FROM scouts;
RESET ROLE;

-- 5-2: 学生Aが学生B宛のスカウトを閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 5-2: 学生A → scouts WHERE 学生B宛 (0行) ===' AS test;
SELECT id FROM scouts WHERE student_id = '22222222-2222-2222-2222-222222222222';
RESET ROLE;

-- 5-3: 学生Aがスカウトのread_atを更新できる (期待: UPDATE 1)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 5-3: 学生A → scouts UPDATE read_at (UPDATE 1) ===' AS test;
UPDATE scouts SET read_at = now() WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
RESET ROLE;

-- 5-4: 学生Aがスカウトのsubjectを更新できない (期待: ERROR permission denied)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 5-4: 学生A → scouts UPDATE subject (ERROR permission denied) ===' AS test;
UPDATE scouts SET subject = 'hacked' WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
RESET ROLE;

-- 5-5: 審査済み企業がスカウトを送信できる (期待: INSERT 0 1)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 5-5: 審査済み企業 → scouts INSERT (INSERT 0 1) ===' AS test;
INSERT INTO scouts (company_id, sender_id, student_id, job_posting_id, subject, message) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'テストスカウト', 'テスト');
RESET ROLE;

-- 5-6: 未審査企業がスカウトを送信できない (期待: ERROR)
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 5-6: 未審査企業 → scouts INSERT (ERROR) ===' AS test;
INSERT INTO scouts (company_id, sender_id, student_id, job_posting_id, subject, message) VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'テスト', 'テスト');
RESET ROLE;

-- 5-7: 企業担当者が自社のスカウトのみ閲覧 (期待: 2行以上)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 5-7: 企業owner → scouts (自社のみ) ===' AS test;
SELECT id, subject, status FROM scouts;
RESET ROLE;

-- =============================================================
-- 6. チャットの制御
-- =============================================================

-- 6-1: 学生Aが承諾済みスカウトのチャットを閲覧 (期待: 2行)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 6-1: 学生A → chat_messages (2行) ===' AS test;
SELECT id, sender_role, content FROM chat_messages;
RESET ROLE;

-- 6-2: 学生Bが学生Aのチャットを閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 6-2: 学生B → chat_messages (0行) ===' AS test;
SELECT id FROM chat_messages;
RESET ROLE;

-- 6-3: 学生Aが承諾済みスカウトにメッセージを送信できる (期待: INSERT 0 1)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 6-3: 学生A → chat_messages INSERT accepted (INSERT 0 1) ===' AS test;
INSERT INTO chat_messages (scout_id, sender_id, sender_role, content) VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'student', 'テストメッセージ');
RESET ROLE;

-- 6-4: 学生Bが未承諾スカウトにメッセージを送信できない (期待: ERROR)
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 6-4: 学生B → chat_messages INSERT sent (ERROR) ===' AS test;
INSERT INTO chat_messages (scout_id, sender_id, sender_role, content) VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', 'student', 'テスト');
RESET ROLE;

-- 6-5: 企業担当者が自社スカウトのチャットを閲覧 (期待: 2行以上)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 6-5: 企業owner → chat_messages (2行以上) ===' AS test;
SELECT id, sender_role, content FROM chat_messages;
RESET ROLE;

-- 6-6: 未審査企業がチャットを閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 6-6: 未審査企業 → chat_messages (0行) ===' AS test;
SELECT id FROM chat_messages;
RESET ROLE;

-- 6-7: 相手のメッセージのread_atを更新できる (期待: UPDATE 1)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 6-7: 学生A → chat_messages UPDATE read_at 相手 (UPDATE 1) ===' AS test;
UPDATE chat_messages SET read_at = now() WHERE scout_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' AND sender_role = 'company_member';
RESET ROLE;

-- 6-8: 自分のメッセージのread_atは更新できない (期待: UPDATE 0)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 6-8: 学生A → chat_messages UPDATE read_at 自分 (UPDATE 0) ===' AS test;
UPDATE chat_messages SET read_at = now() WHERE scout_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' AND sender_id = '11111111-1111-1111-1111-111111111111';
RESET ROLE;

-- =============================================================
-- 7. 通知の制御
-- =============================================================

-- 7-1: 学生Aが自分の通知のみ閲覧 (期待: 1行)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 7-1: 学生A → notifications (1行) ===' AS test;
SELECT id, title FROM notifications;
RESET ROLE;

-- 7-2: 企業ownerが自分の通知のみ閲覧 (期待: 1行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 7-2: 企業owner → notifications (1行) ===' AS test;
SELECT id, title FROM notifications;
RESET ROLE;

-- 7-3: クライアントから通知をINSERTできない (期待: ERROR)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 7-3: 学生A → notifications INSERT (ERROR) ===' AS test;
INSERT INTO notifications (user_id, type, title) VALUES ('11111111-1111-1111-1111-111111111111', 'system_announcement', 'hack');
RESET ROLE;

-- 7-4a: is_read/read_atのみ更新可能 (期待: UPDATE 1)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 7-4a: 学生A → notifications UPDATE is_read (UPDATE 1) ===' AS test;
UPDATE notifications SET is_read = true, read_at = now() WHERE user_id = '11111111-1111-1111-1111-111111111111';
RESET ROLE;

-- 7-4b: title変更は失敗 (期待: ERROR permission denied)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 7-4b: 学生A → notifications UPDATE title (ERROR permission denied) ===' AS test;
UPDATE notifications SET title = 'hacked' WHERE user_id = '11111111-1111-1111-1111-111111111111';
RESET ROLE;

-- =============================================================
-- 8. 学生データの閲覧制御（View経由）
-- =============================================================

-- 8-1: 審査済み企業がpublic_studentsで公開学生を閲覧 (期待: 1行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 8-1: 審査済み企業 → public_students (1行) ===' AS test;
SELECT id, university, faculty FROM public_students;
RESET ROLE;

-- 8-2: 審査済み企業がsearchable_studentsでAI情報付きで閲覧 (期待: 1行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 8-2: 審査済み企業 → searchable_students (1行+AI情報) ===' AS test;
SELECT id, university, summary, activity_volume_score, score_confidence FROM searchable_students;
RESET ROLE;

-- 8-3: 未審査企業がpublic_studentsを閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 8-3: 未審査企業 → public_students (0行) ===' AS test;
SELECT id FROM public_students;
RESET ROLE;

-- 8-4: 未審査企業がsearchable_studentsを閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 8-4: 未審査企業 → searchable_students (0行) ===' AS test;
SELECT id FROM searchable_students;
RESET ROLE;

-- 8-5: 企業担当者がstudents直接アクセス (期待: 公開+accepted 1行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 8-5: 企業owner → students 直接 (公開 or accepted 1行) ===' AS test;
SELECT id, last_name, first_name, email FROM students;
RESET ROLE;

-- 8-6: public_studentsにlast_nameが含まれない (期待: ERROR column does not exist)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 8-6: public_students に last_name なし (ERROR) ===' AS test;
SELECT last_name FROM public_students;
RESET ROLE;

-- 8-7: public_studentsにemailが含まれない (期待: ERROR column does not exist)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 8-7: public_students に email なし (ERROR) ===' AS test;
SELECT email FROM public_students;
RESET ROLE;

-- 8-8: 非公開の学生がViewに含まれない (期待: 学生Bなし = 1行のみ)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 8-8: public_students に学生B(非公開)なし (1行のみ) ===' AS test;
SELECT id, university FROM public_students;
RESET ROLE;

-- 8-9: スカウト承諾後、実名・連絡先を閲覧できる (期待: 学生Aの全カラム)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 8-9: 企業 → students WHERE accepted (実名見える 1行) ===' AS test;
SELECT s.id, s.last_name, s.first_name, s.email, s.phone
FROM students s
WHERE EXISTS (
  SELECT 1 FROM scouts
  WHERE scouts.student_id = s.id
  AND scouts.company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND scouts.status = 'accepted'
);
RESET ROLE;

-- 8-10: スカウト未承諾の非公開学生は見えない (期待: 0行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 8-10: 企業 → students WHERE 学生B 非公開+sent (0行) ===' AS test;
SELECT id, last_name FROM students WHERE id = '22222222-2222-2222-2222-222222222222';
RESET ROLE;

-- =============================================================
-- 8b. 検索条件保存
-- =============================================================

-- 8b-1: 企業担当者が自分の保存検索を閲覧 (期待: 1行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 8b-1: 企業owner → saved_searches (1行) ===' AS test;
SELECT id, name FROM saved_searches;
RESET ROLE;

-- 8b-2: 他の担当者の保存検索を閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
SET request.jwt.claims = '{"app_metadata": {"role": "company_member"}}';
SET ROLE authenticated;
SELECT '=== 8b-2: 企業member → saved_searches (0行) ===' AS test;
SELECT id FROM saved_searches;
RESET ROLE;

-- 8b-3: 企業担当者が検索条件を作成できる (期待: INSERT 0 1)
SET request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
SET request.jwt.claims = '{"app_metadata": {"role": "company_member"}}';
SET ROLE authenticated;
SELECT '=== 8b-3: 企業member → saved_searches INSERT (INSERT 0 1) ===' AS test;
INSERT INTO saved_searches (company_member_id, name, filters) VALUES ('44444444-4444-4444-4444-444444444444', 'テスト検索', '{"graduation_year": 2027}');
RESET ROLE;

-- 8b-4: 企業担当者が自分の検索条件を更新できる (期待: UPDATE 1)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 8b-4: 企業owner → saved_searches UPDATE (UPDATE 1) ===' AS test;
UPDATE saved_searches SET name = 'updated' WHERE id = '77777777-7777-7777-7777-777777777777';
UPDATE saved_searches SET name = 'エンジニア候補' WHERE id = '77777777-7777-7777-7777-777777777777';
RESET ROLE;

-- 8b-5: 企業担当者が自分の検索条件を削除できる (期待: DELETE 1)
-- まず作成してから削除
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
INSERT INTO saved_searches (id, company_member_id, name, filters) VALUES ('11111111-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', '削除用', '{}');
SELECT '=== 8b-5: 企業owner → saved_searches DELETE (DELETE 1) ===' AS test;
DELETE FROM saved_searches WHERE id = '11111111-0000-0000-0000-000000000000';
RESET ROLE;

-- 8b-6: 学生が保存検索にアクセスできない (期待: 0行)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 8b-6: 学生A → saved_searches (0行) ===' AS test;
SELECT id FROM saved_searches;
RESET ROLE;

-- =============================================================
-- 8c. 課金プラン
-- =============================================================

-- 8c-1: 企業担当者が自社のプランを閲覧 (期待: 1行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 8c-1: 企業owner → company_plans (1行) ===' AS test;
SELECT id, plan_type, scout_quota FROM company_plans;
RESET ROLE;

-- 8c-2: 他社のプランを閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 8c-2: 未審査企業 → company_plans WHERE 他社 (0行) ===' AS test;
SELECT id FROM company_plans WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
RESET ROLE;

-- 8c-3: 企業担当者がプランをINSERTできない (期待: ERROR)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 8c-3: 企業owner → company_plans INSERT (ERROR) ===' AS test;
INSERT INTO company_plans (company_id, plan_type) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'premium');
RESET ROLE;

-- 8c-4: 企業担当者がプランをUPDATEできない (期待: UPDATE 0)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 8c-4: 企業owner → company_plans UPDATE (UPDATE 0) ===' AS test;
UPDATE company_plans SET plan_type = 'premium' WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
RESET ROLE;

-- 8c-5: 学生がプランにアクセスできない (期待: 0行)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 8c-5: 学生A → company_plans (0行) ===' AS test;
SELECT id FROM company_plans;
RESET ROLE;

-- =============================================================
-- 9. 企業メンバー管理
-- =============================================================

-- 9-1: 企業担当者が自社メンバーを閲覧 (期待: 2行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 9-1: 企業owner → company_members (自社 2行) ===' AS test;
SELECT id, email, last_name FROM company_members;
RESET ROLE;

-- 9-2: 企業担当者が他社メンバーを閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 9-2: 企業owner → company_members WHERE 他社 (0行) ===' AS test;
SELECT id FROM company_members WHERE company_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
RESET ROLE;

-- 9-3: ownerがメンバーを追加できる (期待: INSERT 0 1)
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change_token_current)
VALUES ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'new-member@verified-corp.com', crypt('password123', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"], "role": "company_member"}', '{}', now(), now(), '', '', '', '');
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (gen_random_uuid(), '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', '{"sub": "66666666-6666-6666-6666-666666666666", "email": "new-member@verified-corp.com"}', 'email', now(), now(), now());

SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 9-3: owner → company_members INSERT (INSERT 0 1) ===' AS test;
INSERT INTO company_members (id, company_id, email, last_name, first_name) VALUES ('66666666-6666-6666-6666-666666666666', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'new-member@verified-corp.com', '山田', '四郎');
RESET ROLE;

-- 9-4: memberがメンバーを追加できない (期待: ERROR)
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change_token_current)
VALUES ('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'another-member@verified-corp.com', crypt('password123', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"], "role": "company_member"}', '{}', now(), now(), '', '', '', '');

SET request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
SET request.jwt.claims = '{"app_metadata": {"role": "company_member"}}';
SET ROLE authenticated;
SELECT '=== 9-4: member → company_members INSERT (ERROR) ===' AS test;
INSERT INTO company_members (id, company_id, email, last_name, first_name) VALUES ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'another-member@verified-corp.com', '渡辺', '五郎');
RESET ROLE;

-- 9-5: ownerがメンバーを削除できる (期待: DELETE 1)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 9-5: owner → company_members DELETE (DELETE 1) ===' AS test;
DELETE FROM company_members WHERE id = '66666666-6666-6666-6666-666666666666';
RESET ROLE;

-- 9-6: memberがメンバーを削除できない (期待: DELETE 0)
SET request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
SET request.jwt.claims = '{"app_metadata": {"role": "company_member"}}';
SET ROLE authenticated;
SELECT '=== 9-6: member → company_members DELETE (DELETE 0) ===' AS test;
DELETE FROM company_members WHERE id = '33333333-3333-3333-3333-333333333333';
RESET ROLE;

-- 9-7: ownerが他社にメンバーを追加できない (期待: ERROR)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 9-7: owner → company_members INSERT 他社 (ERROR) ===' AS test;
INSERT INTO company_members (id, company_id, email, last_name, first_name) VALUES ('77777777-7777-7777-7777-777777777777', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'hack@test.com', 'hack', 'hack');
RESET ROLE;

-- 9-8: ownerが他社メンバーを更新できない (期待: UPDATE 0)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 9-8: owner → company_members UPDATE 他社 (UPDATE 0) ===' AS test;
UPDATE company_members SET last_name = 'hacked' WHERE id = '55555555-5555-5555-5555-555555555555';
RESET ROLE;

-- 9-9: ownerが他社メンバーを削除できない (期待: DELETE 0)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 9-9: owner → company_members DELETE 他社 (DELETE 0) ===' AS test;
DELETE FROM company_members WHERE id = '55555555-5555-5555-5555-555555555555';
RESET ROLE;

-- =============================================================
-- 10. イベントの公開制御
-- =============================================================

-- 10-1: 学生が公開イベント（公開企業主催）を閲覧 (期待: 1行 会社説明会)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 10-1: 学生A → events company (1行) ===' AS test;
SELECT id, title, organizer_type FROM events WHERE organizer_type = 'company';
RESET ROLE;

-- 10-2: 学生が運営主催の公開イベントを閲覧 (期待: 1行 合同企業説明会)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 10-2: 学生A → events platform (1行) ===' AS test;
SELECT id, title, organizer_type FROM events WHERE organizer_type = 'platform';
RESET ROLE;

-- 10-3: (非公開企業にイベントなし — 10-1で間接確認)
SELECT '=== 10-3: (10-1で間接確認済み) ===' AS test;

-- 10-4: 企業担当者が自社イベント+運営イベントを閲覧 (期待: 2行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 10-4: 企業owner → events (自社+運営 2行) ===' AS test;
SELECT id, title, organizer_type FROM events;
RESET ROLE;

-- 10-5a: 審査済み企業がイベントを作成できる (期待: INSERT 0 1)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 10-5a: 審査済み企業 → events INSERT (INSERT 0 1) ===' AS test;
INSERT INTO events (company_id, created_by, organizer_type, title, format, starts_at) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'company', 'テストイベント', 'online', now() + interval '30 days');
RESET ROLE;

-- 10-5b: 未審査企業がイベントを作成できない (期待: ERROR)
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 10-5b: 未審査企業 → events INSERT (ERROR) ===' AS test;
INSERT INTO events (company_id, created_by, organizer_type, title, format, starts_at) VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'company', 'テスト', 'online', now() + interval '30 days');
RESET ROLE;

-- 10-6: 企業担当者が他社のイベントを閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 10-6: 未審査企業 → events WHERE 他社 (0行) ===' AS test;
SELECT id FROM events WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
RESET ROLE;

-- 10-7: 企業担当者が他社のイベントを更新できない (期待: UPDATE 0)
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 10-7: 未審査企業 → events UPDATE 他社 (UPDATE 0) ===' AS test;
UPDATE events SET title = 'hacked' WHERE id = '99999999-9999-9999-9999-999999999999';
RESET ROLE;

-- =============================================================
-- 11. イベント参加申し込み
-- =============================================================

-- 11-1: 学生が自分の申し込みのみ閲覧 (期待: 1行)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 11-1: 学生A → event_registrations (1行) ===' AS test;
SELECT id, event_id, status FROM event_registrations;
RESET ROLE;

-- 11-2: 学生が公開イベントに申し込みできる (期待: INSERT 0 1)
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 11-2: 学生B → event_registrations INSERT (INSERT 0 1) ===' AS test;
INSERT INTO event_registrations (event_id, student_id) VALUES ('88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222');
RESET ROLE;

-- 11-3: 学生が申し込みをキャンセルできる (期待: UPDATE 1)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 11-3: 学生A → event_registrations UPDATE status (UPDATE 1) ===' AS test;
UPDATE event_registrations SET status = 'cancelled', cancelled_at = now() WHERE student_id = '11111111-1111-1111-1111-111111111111';
RESET ROLE;

-- 11-4: 企業が自社イベントの申し込み一覧を閲覧 (期待: 1行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 11-4: 企業owner → event_registrations (自社イベント 1行) ===' AS test;
SELECT id, event_id, student_id, status FROM event_registrations;
RESET ROLE;

-- 11-5: 企業が他社イベントの申し込みを閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 11-5: 企業owner → event_registrations WHERE 運営イベント (0行) ===' AS test;
SELECT id FROM event_registrations WHERE event_id = '88888888-8888-8888-8888-888888888888';
RESET ROLE;

-- 11-6: 企業が自社イベントの申し込みステータスを更新できる (期待: UPDATE 1)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 11-6: 企業owner → event_registrations UPDATE status (UPDATE 1) ===' AS test;
UPDATE event_registrations SET status = 'confirmed' WHERE event_id = '99999999-9999-9999-9999-999999999999' AND student_id = '11111111-1111-1111-1111-111111111111';
RESET ROLE;

-- 11-7: 企業が他社イベントの申し込みステータスを更新できない (期待: UPDATE 0)
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 11-7: 未審査企業 → event_registrations UPDATE 他社 (UPDATE 0) ===' AS test;
UPDATE event_registrations SET status = 'confirmed' WHERE event_id = '99999999-9999-9999-9999-999999999999';
RESET ROLE;

-- =============================================================
-- 12. Service Role 専用テーブル
-- =============================================================

-- 12-1: 学生がanonymous_visitsを閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 12-1: 学生A → anonymous_visits (0行) ===' AS test;
SELECT id FROM anonymous_visits;
RESET ROLE;

-- 12-2: 企業がanonymous_visitsを閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 12-2: 企業owner → anonymous_visits (0行) ===' AS test;
SELECT id FROM anonymous_visits;
RESET ROLE;

-- 12-3: クライアントからanonymous_visitsにINSERTできない (期待: ERROR)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 12-3: 学生A → anonymous_visits INSERT (ERROR) ===' AS test;
INSERT INTO anonymous_visits (session_token) VALUES ('hacked-token');
RESET ROLE;

-- =============================================================
-- 13. 通知設定
-- =============================================================

-- 13-1: 学生が自分の通知設定のみ閲覧 (期待: 1行)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 13-1: 学生A → student_notification_settings (1行) ===' AS test;
SELECT id, student_id FROM student_notification_settings;
RESET ROLE;

-- 13-2: 企業担当者が自分の通知設定のみ閲覧 (期待: 1行)
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SET request.jwt.claims = '{"app_metadata": {"role": "company_owner"}}';
SET ROLE authenticated;
SELECT '=== 13-2: 企業owner → company_notification_settings (1行) ===' AS test;
SELECT id, company_member_id FROM company_notification_settings;
RESET ROLE;

-- 13-3: 学生が他人の通知設定を閲覧できない (期待: 0行)
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims = '{"app_metadata": {"role": "student"}}';
SET ROLE authenticated;
SELECT '=== 13-3: 学生A → student_notification_settings WHERE 学生B (0行) ===' AS test;
SELECT id FROM student_notification_settings WHERE student_id = '22222222-2222-2222-2222-222222222222';
RESET ROLE;

-- =============================================================
-- 14. 未認証ユーザー（anon）の全拒否
-- =============================================================

-- 14-1: 未認証ユーザーが全publicテーブルにアクセスできない (期待: 全てERROR permission denied)
SET ROLE anon;
SELECT '=== 14-1a: anon → students (ERROR) ===' AS test;
SELECT count(*) FROM students;
SELECT '=== 14-1b: anon → companies (ERROR) ===' AS test;
SELECT count(*) FROM companies;
SELECT '=== 14-1c: anon → scouts (ERROR) ===' AS test;
SELECT count(*) FROM scouts;
SELECT '=== 14-1d: anon → job_postings (ERROR) ===' AS test;
SELECT count(*) FROM job_postings;
SELECT '=== 14-1e: anon → chat_messages (ERROR) ===' AS test;
SELECT count(*) FROM chat_messages;
SELECT '=== 14-1f: anon → notifications (ERROR) ===' AS test;
SELECT count(*) FROM notifications;
SELECT '=== 14-1g: anon → events (ERROR) ===' AS test;
SELECT count(*) FROM events;
SELECT '=== 14-1h: anon → anonymous_visits (ERROR) ===' AS test;
SELECT count(*) FROM anonymous_visits;
RESET ROLE;

-- 14-2: 未認証ユーザーがViewにアクセスできない (期待: ERROR permission denied)
SET ROLE anon;
SELECT '=== 14-2a: anon → public_students (ERROR) ===' AS test;
SELECT count(*) FROM public_students;
SELECT '=== 14-2b: anon → searchable_students (ERROR) ===' AS test;
SELECT count(*) FROM searchable_students;
RESET ROLE;

-- =============================================================
-- Done
-- =============================================================
SELECT '========================================' AS result;
SELECT '  ALL 104 TEST CASES EXECUTED' AS result;
SELECT '  Review output above for failures' AS result;
SELECT '========================================' AS result;
