-- =============================================================
-- synced_*_users.email を nullable に変更
--
-- 背景:
--   当初の設計では「学生がスカウトに登録 → 各プロダクトの synced_*_users.email
--   と突合して student_product_links を作成」という email 突合フローだったため、
--   synced_*_users.email は NOT NULL で必須だった。
--
--   しかし現在の設計では:
--   - 同時登録フロー内でプロダクト→スカウトへ state 経由で email と
--     external_user_id が渡される
--   - スカウト側で students.email を state 由来で確定
--   - student_product_links を即時作成（external_user_id 基準）
--
--   ため、synced_*_users.email は「students.email と student_product_links
--   経由で既知のもの」を再度保持しているだけで冗長になった。ETL 側も
--   プロダクト DB/API から email を取得できない（面接AI/企業分析AI の auth.users、
--   すごい就活の Bubble authentication は外部ロールから読めない）ため、
--   NOT NULL を維持できない。
--
--   テーブル削除まで踏み込まず、今回は email を nullable にする保守的変更に留める。
--   将来的に synced_*_users テーブル自体の統廃合を検討する余地は残している。
-- =============================================================

ALTER TABLE synced_interviewai_users  ALTER COLUMN email DROP NOT NULL;
ALTER TABLE synced_compai_users       ALTER COLUMN email DROP NOT NULL;
ALTER TABLE synced_smartes_users      ALTER COLUMN email DROP NOT NULL;
ALTER TABLE synced_sugoshu_users      ALTER COLUMN email DROP NOT NULL;
