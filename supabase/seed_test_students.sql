-- =============================================================
-- 学生検索テスト用 20 件
-- ローカル DB に直接投入する想定:
--   psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' \
--        -f supabase/seed_test_students.sql
-- =============================================================

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token)
VALUES
  ('a0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test01@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  ('a0000002-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test02@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  ('a0000003-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test03@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  ('a0000004-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test04@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  ('a0000005-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test05@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  ('a0000006-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test06@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  ('a0000007-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test07@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  ('a0000008-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test08@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  ('a0000009-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test09@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  ('a0000010-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test10@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  ('a0000011-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test11@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  ('a0000012-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test12@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  ('a0000013-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test13@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  ('a0000014-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test14@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  ('a0000015-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test15@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  ('a0000016-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test16@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  ('a0000017-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test17@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  ('a0000018-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test18@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  ('a0000019-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test19@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{}', now(), now(), '', '', '', '', '', '', ''),
  ('a0000020-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test20@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{}', now(), now(), '', '', '', '', '', '', '');

INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
FROM auth.users
WHERE email LIKE 'test%@example.com';

INSERT INTO students (id, email, last_name, first_name, university, faculty, department, academic_type, graduation_year, prefecture, profile_image_url, bio, is_profile_public, data_consent_granted_at, created_at)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'test01@example.com', '青木', '健太',  '東京大学',     '工学部',    '情報工学科',     'science',      2027, '東京都',   NULL, 'AI/機械学習に強い興味', true, now(), now()),
  ('a0000002-0000-0000-0000-000000000002', 'test02@example.com', '伊藤', '美咲',  '京都大学',     '文学部',    '英文学科',       'liberal_arts', 2027, '京都府',   NULL, '海外マーケに関心',     true, now(), now()),
  ('a0000003-0000-0000-0000-000000000003', 'test03@example.com', '上野', '翔',    '早稲田大学',   '商学部',    '経営学科',       'liberal_arts', 2026, '東京都',   NULL, 'コンサル志望',         true, now(), now()),
  ('a0000004-0000-0000-0000-000000000004', 'test04@example.com', '榎本', '彩',    '慶應義塾大学', '経済学部',  '経済学科',       'liberal_arts', 2027, '神奈川県', NULL, '金融に強い関心',       true, now(), now()),
  ('a0000005-0000-0000-0000-000000000005', 'test05@example.com', '小川', '蓮',    '大阪大学',     '理学部',    '物理学科',       'science',      2028, '大阪府',   NULL, '研究志向',             true, now(), now()),
  ('a0000006-0000-0000-0000-000000000006', 'test06@example.com', '加藤', '結衣',  '名古屋大学',   '工学部',    '機械工学科',     'science',      2027, '愛知県',   NULL, 'メーカー志望',         true, now(), now()),
  ('a0000007-0000-0000-0000-000000000007', 'test07@example.com', '木村', '大輔',  '東北大学',     '医学部',    '医学科',         'medical',      2028, '宮城県',   NULL, '医療×IT',              true, now(), now()),
  ('a0000008-0000-0000-0000-000000000008', 'test08@example.com', '久保', '楓',    '九州大学',     '芸術工学部','デザイン学科',   'arts',         2027, '福岡県',   NULL, 'UI/UXデザイナー志望',  true, now(), now()),
  ('a0000009-0000-0000-0000-000000000009', 'test09@example.com', '小林', '陽斗',  '北海道大学',   '農学部',    '応用生命科学科', 'science',      2026, '北海道',   NULL, 'バイオ/食品',          true, now(), now()),
  ('a0000010-0000-0000-0000-000000000010', 'test10@example.com', '佐々木','凛',   '一橋大学',     '商学部',    '経営学科',       'liberal_arts', 2027, '東京都',   NULL, '商社・コンサル志望',   true, now(), now()),
  ('a0000011-0000-0000-0000-000000000011', 'test11@example.com', '清水', '航',    '神戸大学',     '法学部',    '法律学科',       'liberal_arts', 2027, '兵庫県',   NULL, '公務員/法務',          true, now(), now()),
  ('a0000012-0000-0000-0000-000000000012', 'test12@example.com', '高橋', '葵',    '横浜国立大学', '理工学部',  '建築学科',       'science',      2028, '神奈川県', NULL, '不動産・建設',         true, now(), now()),
  ('a0000013-0000-0000-0000-000000000013', 'test13@example.com', '田村', '優',    '筑波大学',     '体育専門学群', NULL,           'sports',       2027, '茨城県',   NULL, 'スポーツ×ビジネス',    true, now(), now()),
  ('a0000014-0000-0000-0000-000000000014', 'test14@example.com', '中島', '直樹',  '上智大学',     '外国語学部','英語学科',       'liberal_arts', 2026, '東京都',   NULL, '広告/メディア志望',    true, now(), now()),
  ('a0000015-0000-0000-0000-000000000015', 'test15@example.com', '西村', '七海',  '明治大学',     '情報コミュニケーション学部', NULL, 'liberal_arts', 2028, '東京都', NULL, 'マーケ/PR',           true, now(), now()),
  ('a0000016-0000-0000-0000-000000000016', 'test16@example.com', '野田', '拓海',  '東京工業大学', '情報理工学院', NULL,           'science',      2027, '東京都',   NULL, 'バックエンドエンジニア志望', true, now(), now()),
  ('a0000017-0000-0000-0000-000000000017', 'test17@example.com', '橋本', '美月',  '立教大学',     '社会学部',  'メディア社会学科','liberal_arts', 2027, '埼玉県',   NULL, 'PR・広報',             true, now(), now()),
  ('a0000018-0000-0000-0000-000000000018', 'test18@example.com', '藤田', '海斗',  '同志社大学',   '商学部',    '商学科',         'liberal_arts', 2026, '京都府',   NULL, '商社志望',             true, now(), now()),
  ('a0000019-0000-0000-0000-000000000019', 'test19@example.com', '松本', '咲',    '東京藝術大学', '美術学部',  'デザイン科',     'arts',         2028, '東京都',   NULL, 'クリエイティブ職',     true, now(), now()),
  ('a0000020-0000-0000-0000-000000000020', 'test20@example.com', '山田', '颯太',  'その他大学',   'その他学部', NULL,            'other',        2027, '千葉県',   NULL, 'まだ模索中',           true, now(), now());

INSERT INTO student_integrated_profiles (
  student_id, summary, strengths, skills,
  growth_stability_score, specialist_generalist_score, individual_team_score, autonomy_guidance_score,
  logical_thinking_score, communication_score, writing_skill_score, leadership_score,
  activity_volume_score,
  interested_industries, interested_job_types,
  score_confidence, generated_at, model_version
)
VALUES
  ('a0000001-0000-0000-0000-000000000001', '論理的思考とプログラミングに強み',     '["論理的思考","技術力"]',       '["Python","TypeScript"]',       85, 75, 40, 60, 90, 65, 70, 55, 80, ARRAY['it_software','consulting']::text[],            ARRAY['engineer_it']::text[],             80, now(), 'claude-sonnet-4-6'),
  ('a0000002-0000-0000-0000-000000000002', '英語コミュ力と発信力に強み',           '["英語力","発信力"]',           '["英語","ライティング"]',       55, 45, 70, 30, 65, 85, 88, 70, 70, ARRAY['advertising_media','trading_company']::text[], ARRAY['marketing','planning']::text[],    75, now(), 'claude-sonnet-4-6'),
  ('a0000003-0000-0000-0000-000000000003', '構造化と提案力',                       '["論理的思考","リーダーシップ"]','["スライド作成","分析"]',       80, 30, 60, 50, 88, 78, 72, 80, 78, ARRAY['consulting','finance']::text[],                ARRAY['consultant']::text[],              82, now(), 'claude-sonnet-4-6'),
  ('a0000004-0000-0000-0000-000000000004', '数字に強くストイック',                 '["分析力","継続力"]',           '["Excel","統計"]',              45, 60, 35, 65, 82, 60, 65, 45, 60, ARRAY['finance','consulting']::text[],                ARRAY['planning']::text[],                70, now(), 'claude-sonnet-4-6'),
  ('a0000005-0000-0000-0000-000000000005', '探究心が強く論文執筆も得意',           '["探究心","論理的思考"]',       '["数学","物理"]',               20, 90, 25, 80, 92, 50, 80, 30, 50, ARRAY['manufacturing','public_sector']::text[],       ARRAY['research']::text[],                65, now(), 'claude-sonnet-4-6'),
  ('a0000006-0000-0000-0000-000000000006', 'ものづくり志向',                       '["設計力","協調性"]',           '["CAD","C++"]',                 35, 70, 80, 40, 70, 70, 60, 60, 65, ARRAY['manufacturing','infrastructure']::text[],      ARRAY['engineer_other']::text[],          72, now(), 'claude-sonnet-4-6'),
  ('a0000007-0000-0000-0000-000000000007', '医療×ITに関心',                        '["責任感","学習力"]',           '["生物","Python"]',             60, 80, 50, 55, 85, 75, 70, 65, 75, ARRAY['public_sector','it_software']::text[],         ARRAY['research','engineer_it']::text[],  68, now(), 'claude-sonnet-4-6'),
  ('a0000008-0000-0000-0000-000000000008', 'デザインで課題解決',                   '["創造力","ユーザー視点"]',     '["Figma","Illustrator"]',       70, 65, 30, 70, 60, 80, 75, 50, 70, ARRAY['it_software','advertising_media']::text[],     ARRAY['designer']::text[],                78, now(), 'claude-sonnet-4-6'),
  ('a0000009-0000-0000-0000-000000000009', '実験と地道な努力が得意',               '["継続力","観察力"]',           '["生化学","R"]',                25, 85, 45, 50, 75, 55, 65, 40, 55, ARRAY['manufacturing','retail_service']::text[],      ARRAY['research']::text[],                60, now(), 'claude-sonnet-4-6'),
  ('a0000010-0000-0000-0000-000000000010', 'チームを動かすリーダー',               '["リーダーシップ","巻き込み力"]','["プレゼン","ファシリ"]',      75, 25, 90, 35, 78, 88, 70, 92, 88, ARRAY['trading_company','consulting']::text[],        ARRAY['planning','sales']::text[],        85, now(), 'claude-sonnet-4-6'),
  ('a0000011-0000-0000-0000-000000000011', '法務志望で文章力に強み',               '["論理的思考","正確性"]',       '["法律知識","文書作成"]',       30, 75, 30, 75, 80, 55, 90, 35, 50, ARRAY['public_sector','finance']::text[],             ARRAY['corporate']::text[],               73, now(), 'claude-sonnet-4-6'),
  ('a0000012-0000-0000-0000-000000000012', '空間設計に強み',                       '["構想力","継続力"]',           '["AutoCAD","3D設計"]',          40, 80, 60, 60, 78, 65, 70, 55, 60, ARRAY['real_estate','manufacturing']::text[],         ARRAY['engineer_other','planning']::text[],70, now(), 'claude-sonnet-4-6'),
  ('a0000013-0000-0000-0000-000000000013', '部活で培った行動力',                   '["体力","行動力"]',             '["スポーツ","チーム運営"]',     65, 30, 85, 35, 60, 90, 50, 95, 92, ARRAY['advertising_media','retail_service']::text[],  ARRAY['sales','marketing']::text[],       80, now(), 'claude-sonnet-4-6'),
  ('a0000014-0000-0000-0000-000000000014', '広告・メディアに関心',                 '["発信力","好奇心"]',           '["英語","SNS運用"]',            70, 35, 70, 40, 65, 85, 80, 60, 75, ARRAY['advertising_media']::text[],                   ARRAY['marketing','planning']::text[],    72, now(), 'claude-sonnet-4-6'),
  ('a0000015-0000-0000-0000-000000000015', 'マーケに強い関心',                     '["発信力","分析力"]',           '["SNS分析","ライティング"]',    80, 50, 65, 50, 72, 78, 82, 55, 78, ARRAY['advertising_media','it_software']::text[],     ARRAY['marketing']::text[],               74, now(), 'claude-sonnet-4-6'),
  ('a0000016-0000-0000-0000-000000000016', 'バックエンド志向の技術者',             '["技術力","論理的思考"]',       '["Go","SQL","AWS"]',            85, 85, 35, 75, 92, 60, 65, 50, 78, ARRAY['it_software']::text[],                         ARRAY['engineer_it']::text[],             83, now(), 'claude-sonnet-4-6'),
  ('a0000017-0000-0000-0000-000000000017', 'PR・広報志望',                         '["発信力","共感力"]',           '["記事執筆","Premiere"]',       60, 40, 75, 45, 65, 82, 85, 65, 72, ARRAY['advertising_media','retail_service']::text[],  ARRAY['marketing','corporate']::text[],   70, now(), 'claude-sonnet-4-6'),
  ('a0000018-0000-0000-0000-000000000018', '商社志望でグローバル思考',             '["行動力","語学"]',             '["英語","中国語"]',             70, 35, 70, 45, 75, 80, 70, 75, 80, ARRAY['trading_company','finance']::text[],           ARRAY['sales','planning']::text[],        78, now(), 'claude-sonnet-4-6'),
  ('a0000019-0000-0000-0000-000000000019', 'クリエイティブ志望',                   '["創造力","表現力"]',           '["Photoshop","Illustrator"]',   85, 80, 25, 85, 55, 70, 75, 45, 65, ARRAY['advertising_media']::text[],                   ARRAY['designer']::text[],                68, now(), 'claude-sonnet-4-6'),
  ('a0000020-0000-0000-0000-000000000020', '志望はまだ模索中',                     '["柔軟性"]',                    '["基礎学力"]',                  50, 50, 50, 50, 55, 60, 55, 50, 50, ARRAY['other']::text[],                               ARRAY['other']::text[],                   40, now(), 'claude-sonnet-4-6');
