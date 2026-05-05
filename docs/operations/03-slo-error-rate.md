# エラー率 SLO 定義

ver1 | 2026-05-04 作成 | 担当: 瞳子

---

## 0. 位置づけ

- 関連 Issue: [#314](https://github.com/kokoshiro-dev/scout-product/issues/314)（本ドキュメントが対応）/ 親 [#310](https://github.com/kokoshiro-dev/scout-product/issues/310)
- 前提実装: [#45](https://github.com/kokoshiro-dev/scout-product/issues/45) ログ基盤 / Axiom 連携
- 受け渡し先: [#46](https://github.com/kokoshiro-dev/scout-product/issues/46) 稼働監視・アラート設定（本ドキュメントの発火条件を実装）

サービス全体の「許容できないエラー水準」を定量的に定義し、#46 がアラート設定で参照できる粒度の決定事項としてまとめる。

---

## 1. 監視対象のエラー区分

| 区分 | 対象 | カウント方法 | 取得元 |
| :---- | :---- | :---- | :---- |
| HTTP 5xx | Vercel Functions / Route Handler / Edge Function 経由の全レスポンス | `status >= 500` のレスポンス数 / 総リクエスト数 | Vercel Logs → Axiom |
| Server Action error | Next.js Server Actions（`<form action={...}>` 含む）からの throw | 構造化ログの `level=error` かつ `component=server-action` の件数 / 総 Server Action 呼び出し数 | アプリ層構造化ログ → Axiom |
| 外部 API エラー | Claude API / Resend / LINE Login / Supabase Auth Admin への呼び出し | リトライ後も失敗した呼び出し数 / 総呼び出し数（API ごとに集計） | アプリ層構造化ログ → Axiom |
| DB エラー | Supabase Postgres へのクエリ失敗・接続失敗 | `PGRST` / `PostgrestError` / connection error の件数 / 総クエリ数 | アプリ層構造化ログ → Axiom |

### 1.1 SLO 対象外（除外する事象）

| 除外対象 | 理由 |
| :---- | :---- |
| 4xx 系（400/401/403/404/422 等） | クライアント起因。SLO ではなくユーザー導線・バリデーション設計の問題として扱う |
| RLS 拒否（PostgREST `42501`） | 認可仕様どおりの動作。エラーではない |
| Zod バリデーション失敗 | サーバー側で意図的に弾いている入力エラー |
| Claude API の 529（overloaded）でリトライ成功したもの | 最終的に成功しているため |
| メール bounce / complaint | API 呼び出しは成功している。配信成功率は #318 で別管理 |

---

## 2. SLO（許容エラー率）

評価窓は **24 時間ローリング** を基本とする。

| 区分 | 対象 | SLO（許容エラー率） | 目標 |
| :---- | :---- | :---- | :---- |
| HTTP 5xx | 全エンドポイント合算 | < 0.5% / 24h | 99.5% 成功 |
| Server Action error | 全 Server Action 合算 | < 0.5% / 24h | 99.5% 成功 |
| 外部 API エラー | Supabase Auth Admin | < 0.5% / 24h | 99.5% 成功 |
| 外部 API エラー | Claude API（リトライ後） | < 1.0% / 24h | 99.0% 成功 |
| 外部 API エラー | Resend（送信 API） | < 1.0% / 24h | 99.0% 成功 |
| 外部 API エラー | LINE Login | < 1.0% / 24h | 99.0% 成功 |
| DB エラー | クエリ・接続合算 | < 0.1% / 24h | 99.9% 成功 |

### 2.1 数値の根拠

- **5xx / Server Action: 0.5%** — 既存 `02-security-requirements.md` 6.3 の「5xx > 5% で警告」より厳しめの SLO を設定し、5% は障害級として別途扱う。Google SRE のサービスレベル指標例（コアパス 99.5%）に準拠。
- **Claude / Resend / LINE: 1.0%** — 外部依存は障害頻度がコントロール外であり、Anthropic の SLA（99.5% 月次稼働率の目安）と整合。リトライ後の最終失敗率で評価する。
- **Supabase Auth: 0.5%** — 認証はクリティカルパス。Supabase のマネージド SLA（99.9% 月次）と整合。
- **DB: 0.1%** — DB エラーは即障害化するため、最厳水準を設定。

---

## 3. アラート発火条件

「Severity」「条件」「通知先」を区分ごとに定義する。バーンレート（短時間で SLO 予算を急激に消費）と継続時間ベース（一定時間しきい値超過）を併用。

### 3.1 Severity の定義

| Severity | 意味 | 期待される対応 |
| :---- | :---- | :---- |
| **P1** | 障害級。即時対応が必要 | 30 分以内に一次反応・根本原因の調査着手 |
| **P2** | 要確認。SLO は崩れていないが兆候あり | 翌営業日中に確認・チケット化 |

### 3.2 区分ごとの発火条件

| 区分 | Severity | 発火条件 | 備考 |
| :---- | :---- | :---- | :---- |
| HTTP 5xx | P1 | 5xx 率が **5% を 5 分継続** | 既存の障害基準と整合 |
| HTTP 5xx | P2 | 5xx 率が **1% を 30 分継続** | SLO（0.5%）の倍を継続したら兆候とみなす |
| Server Action error | P1 | エラー率 **5% を 5 分継続** | |
| Server Action error | P2 | エラー率 **1% を 30 分継続** | |
| Claude API | P2 | 失敗率 **5% を 30 分継続** | コスト上限アラートは #52 で別管理 |
| Resend API | P1 | 失敗率 **5% を 10 分継続** | スカウト・通知の重要経路。配信成功率は #318 |
| LINE Login | P2 | 失敗率 **5% を 30 分継続** | ログインフローの広域影響時のみ。個別失敗率は #316 |
| Supabase Auth Admin | P1 | 失敗率 **2% を 5 分継続** | 認証断は即障害 |
| DB エラー（接続） | P1 | 接続エラー **1 件発生で即時** | 接続断は即障害 |
| DB エラー（クエリ） | P2 | クエリエラー率 **0.5% を 10 分継続** | |

### 3.3 バーンレート（補助）

24h SLO 予算を 1 時間で 14.4 倍消費した場合に P1 を補助発火する（Google SRE Workbook 準拠）。実装は #46 にて Axiom Monitor のクエリで設定。

| 区分 | バーンレート発火 |
| :---- | :---- |
| HTTP 5xx | 1h で 6h 分の予算消費 → P1 |
| Server Action error | 1h で 6h 分の予算消費 → P1 |

外部 API・DB は継続時間ベースのみで運用し、バーンレートは導入しない（誤検知が多い想定）。

---

## 4. アラート通知先

| Severity | 一次通知 | 二次通知（fallback） | 対応者 |
| :---- | :---- | :---- | :---- |
| P1 | Slack `#alerts-prod` に **@福田** メンション付きで投稿 | 5 分以内に未確認の場合、福田にメール通知 | 福田（一次対応）→ 担当機能オーナーへエスカレーション |
| P2 | Slack `#alerts-prod` にメンションなし投稿 | なし | 翌営業日に瞳子が確認 |

- Slack チャンネル `#alerts-prod` は #46 実装時に新規作成する（既存チャンネル `#alerts` 等が運用中であればそちらに統合する）。
- 通知先メンバーは MVP 期は福田（運営）のみ。Phase 5 以降にオンコール体制を見直す。

---

## 5. レビュー・更新サイクル

| 頻度 | 内容 | 担当 |
| :---- | :---- | :---- |
| リリース直後（1 週間） | 実測値と SLO の乖離を確認し、必要なら閾値を調整 | 瞳子 |
| 月次 | エラー予算の消費状況をレビュー | 瞳子 |
| 半年ごと | SLO 自体の見直し（過剰・過小の調整） | 瞳子 |

---

## 6. 関連ドキュメント・Issue

- `docs/operations/02-security-requirements.md` 6.3 監視・アラート（粗い閾値の上位互換として本ドキュメントが詳細化）
- #45 Axiom 連携（本 SLO の集計基盤）
- #46 稼働監視・アラート設定（本 SLO の発火条件を実装）
- #315 レスポンス時間 SLO / #316 認証失敗率 / #317 スカウト送信失敗率 / #318 メール配信成功率 / #319 DAU・WAU・MAU / #52 Claude API コスト
