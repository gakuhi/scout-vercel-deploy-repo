-- =============================================================
-- MBTI テーブル作成 + students に外部キー追加
-- =============================================================

-- ----- 1. mbti_types マスターテーブル -----
CREATE TABLE mbti_types (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_code TEXT NOT NULL UNIQUE,  -- 'INTJ', 'ENFP' など
  name_ja   TEXT NOT NULL,         -- 日本語名（例: '建築家'）
  name_en   TEXT NOT NULL,         -- 英語名（例: 'Architect'）
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ----- 2. 16タイプの初期データ投入 -----
INSERT INTO mbti_types (type_code, name_ja, name_en) VALUES
  ('INTJ', '建築家', 'Architect'),
  ('INTP', '論理学者', 'Logician'),
  ('ENTJ', '指揮官', 'Commander'),
  ('ENTP', '討論者', 'Debater'),
  ('INFJ', '提唱者', 'Advocate'),
  ('INFP', '仲介者', 'Mediator'),
  ('ENFJ', '主人公', 'Protagonist'),
  ('ENFP', '広報運動家', 'Campaigner'),
  ('ISTJ', '管理者', 'Logistician'),
  ('ISFJ', '擁護者', 'Defender'),
  ('ESTJ', '幹部', 'Executive'),
  ('ESFJ', '領事官', 'Consul'),
  ('ISTP', '巨匠', 'Virtuoso'),
  ('ISFP', '冒険家', 'Adventurer'),
  ('ESTP', '起業家', 'Entrepreneur'),
  ('ESFP', 'エンターテイナー', 'Entertainer');

-- ----- 3. students テーブルに外部キー追加 -----
ALTER TABLE students
  ADD COLUMN mbti_type_id UUID REFERENCES mbti_types(id);

-- ----- 4. インデックス -----
CREATE INDEX idx_students_mbti_type_id ON students (mbti_type_id);

-- ----- 5. RLS -----
ALTER TABLE mbti_types ENABLE ROW LEVEL SECURITY;

-- mbti_types はマスターデータなので認証済みユーザー全員が読み取り可能
CREATE POLICY mbti_types_select_authenticated ON mbti_types
  FOR SELECT USING (auth.uid() IS NOT NULL);
