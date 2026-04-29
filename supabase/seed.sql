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
-- GoTrue が email_change / phone_change / phone_change_token を NULL 非許容で扱うため、
-- 空文字を明示的に設定する。設定しないとログイン API が Scan error で 500 を返す。
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token)
VALUES
  -- 学生A
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-a@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"], "role": "student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  -- 学生B
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-b@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"], "role": "student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  -- 審査済み企業 owner
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@verified-corp.com', crypt('password123', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"], "role": "company_owner"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  -- 審査済み企業 member
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member@verified-corp.com', crypt('password123', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"], "role": "company_member"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  -- 未審査企業 owner
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@unverified-corp.com', crypt('password123', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"], "role": "company_owner"}', '{}', now(), now(), '', '', '', '', '', '', '');

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

-- ----- synced_smartes_users -----
INSERT INTO synced_smartes_users (external_user_id, email, synced_at)
VALUES
  ('ext-user-001', 'student-a@test.com', now());

-- ----- synced_smartes_generated_es (学生Aの外部ID) -----
INSERT INTO synced_smartes_generated_es (external_user_id, external_es_id, generated_params, generated_text, regenerated_count, generated_at, synced_at)
VALUES
  ('ext-user-001', 'es-001', '{"company": "テスト商事", "question": "志望動機を教えてください"}', 'AIで社会課題を解決したい', 0, now(), now());

-- ----- synced_compai_users -----
INSERT INTO synced_compai_users (external_user_id, email, synced_at)
VALUES
  ('ext-compai-001', 'student-a@test.com', now());

-- ----- synced_compai_researches (学生Aの外部ID) -----
INSERT INTO synced_compai_researches (external_user_id, external_research_id, title, content, status, synced_at)
VALUES
  ('ext-compai-001', 'research-001', 'テスト商事の企業分析', 'IT企業の分析結果', 'completed', now());

-- ----- synced_interviewai_users -----
INSERT INTO synced_interviewai_users (external_user_id, email, synced_at)
VALUES
  ('ext-interview-001', 'student-a@test.com', now());

-- ----- synced_interviewai_sessions (学生Aの外部ID) -----
INSERT INTO synced_interviewai_sessions (external_user_id, external_session_id, session_type, overall_score, skill_scores, synced_at)
VALUES
  ('ext-interview-001', 'session-001', '個人面接', 75, '{"logicalStructure": 80, "qaSkill": 70, "responseContent": 75}', now());

-- ----- student_integrated_profiles (学生Aのみ) -----
-- 03-02-matching-design.md に準拠したスコアベースのプロフィール
INSERT INTO student_integrated_profiles (
  student_id, summary, strengths, skills,
  growth_stability_score, specialist_generalist_score, individual_team_score, autonomy_guidance_score,
  logical_thinking_score, communication_score, writing_skill_score, leadership_score,
  activity_volume_score,
  interested_industries, interested_job_types,
  score_confidence, generated_at, model_version
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'AI技術に関心が高く行動力のある学生',
    '["論理的思考", "プログラミング"]',
    '["Python", "機械学習"]',
    82, 70, 55, 65,
    80, 68, 70, 60,
    75,
    ARRAY['it_software', 'consulting']::text[],
    ARRAY['engineer_it']::text[],
    65, now(), 'claude-sonnet-4-6'
  );

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
INSERT INTO student_notification_settings (student_id, scout_received, chat_message, in_app_enabled)
VALUES
  ('11111111-1111-1111-1111-111111111111', true, true, true),
  ('22222222-2222-2222-2222-222222222222', true, true, true);

-- ----- company_notification_settings -----
INSERT INTO company_notification_settings (company_member_id, scout_accepted, chat_message, line_enabled)
VALUES
  ('33333333-3333-3333-3333-333333333333', true, true, true);

-- ----- events -----
-- RLS 検証用の最小 2 件 ＋ 学生イベント画面デモ用の 16 件
INSERT INTO events (id, company_id, created_by, organizer_type, title, description, format, starts_at, is_published, published_at, created_at)
VALUES
  -- 審査済み企業の公開イベント（RLS 検証用）
  ('99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'company', '会社説明会', 'エンジニア向け会社説明会', 'online', now() + interval '7 days', true, now(), now()),
  -- 運営主催の公開イベント（RLS 検証用）
  ('88888888-8888-8888-8888-888888888888', NULL, NULL, 'platform', '合同企業説明会', '運営主催の合同説明会', 'offline', now() + interval '14 days', true, now(), now());

-- 学生イベント画面デモ用の 16 件（全て platform 主催）
INSERT INTO events (
  id, company_id, created_by, organizer_type, title, description,
  event_type, format, location, online_url,
  starts_at, ends_at, capacity, application_deadline, target_graduation_year,
  is_published, published_at
) VALUES
  ('10000000-0000-0000-0000-000000000001', NULL, NULL, 'platform',
   '次世代リーダーのためのエグゼクティブ・キャリア戦略 2026',
   E'次世代のリーダーを目指す若手プロフェッショナルのための、完全招待制キャリア戦略フォーラムを開催いたします。本イベントでは、業界を牽引するエグゼクティブたちが、激変するビジネス環境における「市場価値」の再定義と、自律的なキャリア形成について深く掘り下げます。\n\n建築的な精密さで設計されたこの 1 日限りのプログラムを通じて、参加者は自身のポテンシャルを最大限に引き出すための実践的な知見と、志を同じくするエリートネットワークへのアクセスを得ることができます。',
   'career', 'offline', '東京 / 帝国ホテル', NULL,
   '2026-05-20 10:00:00+09', '2026-05-20 18:00:00+09', 50, '2026-05-15 23:59:59+09', 2027,
   true, now()),
  ('10000000-0000-0000-0000-000000000002', NULL, NULL, 'platform',
   'AI時代のプロダクトマネジメント：グローバル視点での実践手法',
   'シリコンバレー / 東京 / シンガポールを舞台に活躍する PM が集結し、AI プロダクトの立ち上げと成長戦略を体系的に解説します。',
   'skillup', 'online', 'オンライン開催', 'https://example.com/webinar/ai-pm',
   '2026-05-22 15:00:00+09', '2026-05-22 17:00:00+09', 200, '2026-05-18 23:59:59+09', NULL,
   true, now()),
  ('10000000-0000-0000-0000-000000000003', NULL, NULL, 'platform',
   'トップスカウトによるプレミアム・キャリア・ミートアップ in 大阪',
   '関西圏で活躍する現役スカウトと若手プロフェッショナルが直接対話できるクローズドイベント。',
   'networking', 'hybrid', '大阪スカイラウンジ + オンライン配信', 'https://example.com/live/osaka',
   '2026-06-05 18:00:00+09', '2026-06-05 21:00:00+09', 80, '2026-05-30 23:59:59+09', 2028,
   true, now()),
  ('10000000-0000-0000-0000-000000000004', NULL, NULL, 'platform',
   '【20名限定】戦略コンサルティング・ワークショップ',
   '外資系ファームの現役パートナーが講師を務める、超少人数制の実践ワークショップ。',
   'skillup', 'offline', '東京本社 A 会議室', NULL,
   '2026-06-12 13:00:00+09', '2026-06-12 17:00:00+09', 20, '2026-06-05 23:59:59+09', 2027,
   true, now()),
  ('10000000-0000-0000-0000-000000000005', NULL, NULL, 'platform',
   'データサイエンス実務：ビジネス価値を生み出す分析の鉄則',
   '入門から実務応用までを一気通貫で解説するライブセミナー。定員制限なし。',
   'skillup', 'online', 'Zoom ウェビナー', 'https://example.com/webinar/data-science',
   '2026-06-18 19:00:00+09', '2026-06-18 21:00:00+09', NULL, '2026-06-15 23:59:59+09', NULL,
   true, now()),
  ('10000000-0000-0000-0000-000000000006', NULL, NULL, 'platform',
   '外資系テック企業合同採用説明会 2026 Summer',
   '世界トップクラスのテック企業 20 社以上が参加する大規模採用説明会。',
   'session', 'offline', '六本木ヒルズタワー', NULL,
   '2026-06-25 13:00:00+09', '2026-06-25 18:00:00+09', 300, '2026-06-20 23:59:59+09', 2027,
   true, now()),
  ('10000000-0000-0000-0000-000000000007', NULL, NULL, 'platform',
   'グローバル人材のためのキャリア構築セミナー',
   '海外就職・国際業務に関心のある学生向け。アメリカ、シンガポール、ロンドン在住の現役ビジネスパーソンが登壇します。',
   'session', 'online', 'オンライン開催', 'https://example.com/webinar/global-career',
   '2026-07-02 20:00:00+09', '2026-07-02 22:00:00+09', 100, '2026-06-28 23:59:59+09', 2028,
   true, now()),
  ('10000000-0000-0000-0000-000000000008', NULL, NULL, 'platform',
   '国内トップ商社による業界研究会',
   '五大商社の若手社員が業界構造と仕事内容を赤裸々に語ります。',
   'career', 'offline', '東京・丸の内', NULL,
   '2026-07-08 14:00:00+09', '2026-07-08 17:00:00+09', 80, '2026-04-10 23:59:59+09', 2027,
   true, now()),
  ('10000000-0000-0000-0000-000000000009', NULL, NULL, 'platform',
   'Python データ分析ハンズオン入門',
   'pandas / matplotlib を使った実データ分析を手を動かしながら学ぶ初級ハンズオン。',
   'skillup', 'online', 'Zoom ウェビナー', 'https://example.com/webinar/python-handson',
   '2026-07-15 19:00:00+09', '2026-07-15 21:30:00+09', 150, '2026-07-10 23:59:59+09', NULL,
   true, now()),
  ('10000000-0000-0000-0000-000000000010', NULL, NULL, 'platform',
   '若手起業家交流会 in 福岡',
   '九州拠点のスタートアップ創業者と学生がフラットに対話する交流会。',
   'networking', 'offline', '福岡・天神', NULL,
   '2026-07-20 18:00:00+09', '2026-07-20 21:00:00+09', 40, '2026-07-15 23:59:59+09', 2028,
   true, now()),
  ('10000000-0000-0000-0000-000000000011', NULL, NULL, 'platform',
   '外資系ファーム ケース面接対策講座',
   'McKinsey / BCG / Bain の選考を突破した若手コンサルタントが登壇し、実演形式で対策を解説。',
   'skillup', 'online', 'オンライン開催', 'https://example.com/webinar/case-interview',
   '2026-07-28 19:30:00+09', '2026-07-28 21:30:00+09', 60, '2026-07-20 23:59:59+09', 2027,
   true, now()),
  ('10000000-0000-0000-0000-000000000012', NULL, NULL, 'platform',
   'トップ VC とのネットワーキングナイト',
   '国内外の著名 VC パートナーが一堂に会する、完全招待制のネットワーキングイベント。',
   'networking', 'hybrid', '六本木ヒルズ + オンライン配信', 'https://example.com/live/vc-night',
   '2026-08-03 19:00:00+09', '2026-08-03 22:00:00+09', 30, '2026-07-28 23:59:59+09', NULL,
   true, now()),
  ('10000000-0000-0000-0000-000000000013', NULL, NULL, 'platform',
   'メガバンク主催 資産運用セミナー',
   'メガバンク 3 行のアセットマネジメント部門責任者が、若手向けに投資・運用の基本を語ります。',
   'session', 'online', 'オンライン開催', 'https://example.com/webinar/asset-management',
   '2026-08-10 18:00:00+09', '2026-08-10 19:30:00+09', 500, '2026-08-05 23:59:59+09', 2028,
   true, now()),
  ('10000000-0000-0000-0000-000000000014', NULL, NULL, 'platform',
   'スタートアップ合同採用説明会',
   '成長期スタートアップ 15 社による合同採用説明会。エンジニア職・ビジネス職のポジションあり。',
   'session', 'offline', '渋谷スクランブルスクエア', NULL,
   '2026-08-18 13:00:00+09', '2026-08-18 18:00:00+09', 250, '2026-08-10 23:59:59+09', 2027,
   true, now()),
  ('10000000-0000-0000-0000-000000000015', NULL, NULL, 'platform',
   '英語プレゼンテーション集中ワークショップ',
   '外資系企業の面接・職場で求められる英語プレゼンを、半日で徹底的にトレーニング。',
   'skillup', 'online', 'Zoom ウェビナー', 'https://example.com/webinar/english-pres',
   '2026-08-25 14:00:00+09', '2026-08-25 18:00:00+09', 40, '2026-08-20 23:59:59+09', NULL,
   true, now()),
  ('10000000-0000-0000-0000-000000000016', NULL, NULL, 'platform',
   '日系トップ IT 企業による新卒採用キックオフ',
   '国内トップ IT 企業 5 社合同で 2027 年卒向け採用活動を本格化させるキックオフイベント。',
   'session', 'hybrid', '品川インターシティホール + オンライン配信', 'https://example.com/live/it-kickoff',
   '2026-09-02 14:00:00+09', '2026-09-02 17:00:00+09', 400, '2026-08-28 23:59:59+09', 2027,
   true, now());

-- ----- event_registrations -----
INSERT INTO event_registrations (event_id, student_id, status, applied_at)
VALUES
  -- RLS 検証用
  ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'applied', now()),
  -- 学生 A のデモ用申込（UI の「申し込み済み」バッジ確認用）
  ('10000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'applied', now()),
  ('10000000-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', 'applied', now());

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
