-- =============================================================
-- 住所の建物名・部屋番号を分離するための building カラムを追加
-- street: 町名・番地（必須）
-- building: 建物名・部屋番号（任意）
-- =============================================================

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS building TEXT;

COMMENT ON COLUMN students.building IS
  '建物名・部屋番号。任意入力。郵便番号 + 都道府県 + 市区町村 + street と組み合わせて表示する。';
