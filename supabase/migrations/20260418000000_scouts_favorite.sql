-- =============================================================
-- scouts テーブルにお気に入りフラグ追加
-- 学生が気になるスカウトに星を付けて後から絞り込めるようにする。
-- =============================================================

ALTER TABLE scouts
  ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT false;

-- お気に入りフィルタでよく引かれる (student_id, is_favorite) の部分インデックス。
-- true のものだけ張れば十分なので部分インデックスにする。
CREATE INDEX idx_scouts_student_favorite
  ON scouts (student_id)
  WHERE is_favorite = true;
