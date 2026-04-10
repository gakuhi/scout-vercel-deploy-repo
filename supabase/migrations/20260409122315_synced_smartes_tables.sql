-- =============================================================
-- SmartES 連携テーブル作成
-- synced_smartes_users / synced_smartes_generated_es /
-- synced_smartes_motivations / synced_smartes_gakuchika
-- =============================================================

-- ----- synced_smartes_users -----
CREATE TABLE synced_smartes_users (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id    TEXT        NOT NULL UNIQUE,
  email               TEXT        NOT NULL,
  original_created_at TIMESTAMPTZ,
  synced_at           TIMESTAMPTZ DEFAULT now()
);

-- ----- synced_smartes_generated_es -----
CREATE TABLE synced_smartes_generated_es (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id    TEXT        NOT NULL,
  external_es_id      TEXT        NOT NULL UNIQUE,
  generated_params    JSONB,
  original_es_list    JSONB,
  generated_text      TEXT,
  regenerated_count   INT,
  generated_at        TIMESTAMPTZ,
  original_created_at TIMESTAMPTZ,
  synced_at           TIMESTAMPTZ DEFAULT now()
);

-- ----- synced_smartes_motivations -----
CREATE TABLE synced_smartes_motivations (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id       TEXT        NOT NULL,
  external_motivation_id TEXT        NOT NULL UNIQUE,
  generated_params       JSONB,
  generated_text         TEXT,
  regenerated_count      INT,
  generated_at           TIMESTAMPTZ,
  original_created_at    TIMESTAMPTZ,
  synced_at              TIMESTAMPTZ DEFAULT now()
);

-- ----- synced_smartes_gakuchika -----
CREATE TABLE synced_smartes_gakuchika (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id        TEXT        NOT NULL,
  external_gakuchika_id   TEXT        NOT NULL UNIQUE,
  generated_params        JSONB,
  original_gakuchika_list JSONB,
  generated_text          TEXT,
  regenerated_count       INT,
  generated_at            TIMESTAMPTZ,
  original_created_at     TIMESTAMPTZ,
  synced_at               TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- インデックス
-- =============================================================

CREATE INDEX idx_synced_smartes_users_email ON synced_smartes_users (email);
CREATE INDEX idx_synced_smartes_generated_es_user ON synced_smartes_generated_es (external_user_id);
CREATE INDEX idx_synced_smartes_motivations_user ON synced_smartes_motivations (external_user_id);
CREATE INDEX idx_synced_smartes_gakuchika_user ON synced_smartes_gakuchika (external_user_id);

-- =============================================================
-- RLS: synced_* テーブルはクライアントからアクセスさせない
-- ETL（Service Role Key）のみが読み書きする
-- =============================================================

ALTER TABLE synced_smartes_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_smartes_generated_es ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_smartes_motivations ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_smartes_gakuchika ENABLE ROW LEVEL SECURITY;

-- RLSポリシーなし = クライアント（anon/authenticated）からのアクセスは全拒否
-- Service Role Key は RLS をバイパスするので ETL ジョブからは読み書き可能
