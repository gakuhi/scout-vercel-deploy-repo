# ログ定量目標 / SLO 概観

ver1 | 2026-05-05 作成 | 担当: 瞳子

---

## 0. このドキュメントの位置づけ

- 関連 Issue: [#310](https://github.com/kokoshiro-dev/scout-product/issues/310)（本ドキュメントが対応・親 Issue）
- 前提: [#45](https://github.com/kokoshiro-dev/scout-product/issues/45) Axiom 連携
- 次工程: [#46](https://github.com/kokoshiro-dev/scout-product/issues/46) 稼働監視・アラート設定（本ドキュメント群の発火条件を実装）

ログ基盤（#45）で取得するメトリクスについて、何をどの水準で監視するかを定量的に定義した一連の決定事項のインデックス。サブ Issue ごとに個別ドキュメントを作成し、本ドキュメントで横断ビューを提供する。

---

## 1. ドキュメント一覧

| ドキュメント | 対応 Issue | 主な決定事項 |
| :---- | :---- | :---- |
| [03-slo-error-rate.md](./03-slo-error-rate.md) | #314 | HTTP 5xx / Server Action / 外部 API / DB のエラー率 SLO |
| [03-slo-response-time.md](./03-slo-response-time.md) | #315 | 主要ページ・API の p95 / p99 目標 |
| [03-slo-email-delivery.md](./03-slo-email-delivery.md) | #318 | Resend の delivered / bounce / complaint 監視目標 |
| [03-slo-auth-failure.md](./03-slo-auth-failure.md) | #316 | LINE / マジックリンク / 企業パスワード等の認証失敗率 |
| [03-slo-scout-failure.md](./03-slo-scout-failure.md) | #317 | スカウト送信の段階別（API / 通知発火 / 外部送出）失敗率 |
| [03-cost-claude-api.md](./03-cost-claude-api.md) | #52 | Claude API 月次コスト上限・アラート閾値 |
| [03-active-user-metrics.md](./03-active-user-metrics.md) | #319 | DAU / WAU / MAU の定義・集計方針 |

> SLO ではなくプロダクト KPI（DAU 系）も同列に置く。アラート対象か否かは個別ドキュメントの 4 章で明示。

---

## 2. SLO 一覧（横断サマリ）

レビューしやすさ優先で、各ドキュメントの数値だけを抜粋。詳細・根拠は各ドキュメントを参照。

| 領域 | 指標 | SLO（24h ローリング基準） |
| :---- | :---- | :---- |
| エラー率 | HTTP 5xx | < 0.5% |
| エラー率 | Server Action | < 0.5% |
| エラー率 | Claude API（リトライ後） | < 1.0% |
| エラー率 | Resend API | < 1.0% |
| エラー率 | LINE Login | < 1.0% |
| エラー率 | Supabase Auth | < 0.5% |
| エラー率 | DB エラー | < 0.1% |
| レスポンス時間 | コア SSR ページ | p95 < 1.5s / p99 < 3.0s |
| レスポンス時間 | コア Server Action（標準） | p95 < 1.0s / p99 < 2.0s |
| レスポンス時間 | コア Server Action（通知発火を伴う） | p95 < 2.0s / p99 < 4.0s |
| レスポンス時間 | 学生検索 | p95 < 2.5s / p99 < 5.0s |
| レスポンス時間 | LINE Webhook | p95 < 1.0s / p99 < 2.0s |
| レスポンス時間 | 同期系 API（Claude 含む） | p95 < 60s / p99 < 90s |
| メール配信 | Delivered 率 | 24h ≥ 98.0% / 7d ≥ 99.0% |
| メール配信 | Hard Bounce 率 | 24h < 2.0% / 7d < 1.0% |
| メール配信 | Complaint 率 | 24h < 0.5% / 7d < 0.1% |
| 認証失敗 | サービス健全性 | 各認証種別で異常レンジを定義（個別 doc 3 章） |
| 認証失敗 | 不正検知 | 同一 IP/メールへの集中失敗パターン |
| スカウト | 送信 API（①） | < 0.5% |
| スカウト | 通知発火（②） | < 1.0% |
| スカウト | 外部送出（③） | < 2.0% |
| スカウト | E2E（クリック → in-app 通知） | < 1.5% |
| Claude コスト | 月次想定通常 | $50 以内 |
| Claude コスト | ハード上限 | $300 |
| アクティブユーザー | DAU / WAU / MAU | アラート対象外。Axiom Dashboard で日次可視化 |

---

## 3. アラート発火条件（#46 への引き渡し）

#46（稼働監視・アラート設定）が実装で参照できる粒度で、全 P1 / P2 アラートを集約。

### 3.1 P1（即時対応）

| 領域 | 監視対象 | 発火条件 | 出典 |
| :---- | :---- | :---- | :---- |
| エラー率 | HTTP 5xx | 5% を 5 分継続 | 03-slo-error-rate.md 3.2 |
| エラー率 | Server Action | 5% を 5 分継続 | 同上 |
| エラー率 | Resend API | 5% を 10 分継続 | 同上 |
| エラー率 | Supabase Auth | 2% を 5 分継続 | 同上 |
| エラー率 | DB 接続エラー | 1 件発生で即時 | 同上 |
| エラー率 バーンレート | 5xx / Server Action | 1h で 6h 分の予算消費 | 03-slo-error-rate.md 3.3 |
| レスポンス時間 | コア SSR ページ p95 | 3.0s を 10 分継続 | 03-slo-response-time.md 3.1 |
| レスポンス時間 | コア Server Action p95 | 5.0s を 10 分継続 | 同上 |
| レスポンス時間 | 学生検索 p95 | 8.0s を 10 分継続 | 同上 |
| レスポンス時間 | LINE Webhook p95 | 3.0s を 5 分継続 | 03-slo-response-time.md 3.2 |
| レスポンス時間 | Claude API タイムアウト | 5% を 10 分継続 | 同上 |
| レスポンス時間 | Vercel Functions タイムアウト | 1% を 5 分継続 | 03-slo-response-time.md 3.3 |
| メール配信 | Complaint 率 | 24h で 0.5% 超過 | 03-slo-email-delivery.md 3 |
| メール配信 | Hard Bounce 率 | 24h で 2.0% 超過 | 同上 |
| メール配信 | Delivered 率 | 24h で 95% 未満 | 同上 |
| メール配信 | 急増 | 1h に bounce 20 件以上連続 | 03-slo-email-delivery.md 3.1 |
| メール配信 | 急増 | 1h に complaint 5 件以上 | 同上 |
| 認証失敗 | LINE ログイン | 30% を 10 分継続 | 03-slo-auth-failure.md 3.1 |
| 認証失敗 | マジックリンク | 40% を 30 分継続 | 同上 |
| 認証失敗（不正） | 同一 IP からの認証失敗 | 10 分間に 20 回以上 | 03-slo-auth-failure.md 3.2 |
| 認証失敗（不正） | 同一メール宛の失敗 | 10 分間に 10 回以上 | 同上 |
| スカウト | 送信 API | 5% を 5 分継続 | 03-slo-scout-failure.md 3 |
| スカウト | 通知発火 | 5% を 10 分継続 | 同上 |
| スカウト | E2E | 5% を 10 分継続 | 同上 |
| スカウト | 連続失敗 | ① で 5 件以上連続（5 分以内） | 03-slo-scout-failure.md 3.1 |
| Claude コスト | 月次累計 | $200 / $300 到達 | 03-cost-claude-api.md 3.1 |
| Claude コスト | スパイク | 1 時間で $10 超過 | 03-cost-claude-api.md 3.2 |
| Claude コスト | 攻撃面 | `force=true` 連続 5 回以上（同一学生） | 同上 |

### 3.2 P2（要確認）

P2 はメンション無し、翌営業日に瞳子が確認。詳細は各ドキュメントの 3 章を参照。代表例:

- HTTP 5xx 1% を 30 分継続
- 各 SSR ページ p95 が目標値を 30 分〜1 時間継続
- Hard Bounce 率 7d で 1.0% 超過
- Complaint 率 7d で 0.1% 超過
- Soft Bounce 率 24h で 5.0% 超過
- Claude コスト月次累計 $100 到達
- 単一 Claude リクエストの input トークンが 50,000 超過

### 3.3 通知先（共通）

全領域で共通。

| Severity | 一次通知 | 二次通知 |
| :---- | :---- | :---- |
| P1 | Slack `#alerts-prod` に **@福田** メンション | 5 分以内未確認でメール |
| P2 | Slack `#alerts-prod` のみ | なし |

> Slack チャンネル `#alerts-prod` は #46 実装時に新規作成。既存運用の `#alerts` 等があればそちらに統合する。

---

## 4. 実装上の前提（#45 への要件）

本 SLO 群が機能するために、ログ基盤（#45）で以下を満たす必要がある。

| 項目 | 要件 |
| :---- | :---- |
| 構造化ログ | アプリ層から JSON 形式で `level, component, status, duration_ms, request_id` を統一フィールドとして出力 |
| Server Action ログ | 全 Server Action に開始・終了・失敗のログを統一フォーマットで出力 |
| API Route ログ | middleware で全 API Route に request_id・処理時間を記録 |
| Supabase Auth ログ転送 | Supabase の Auth ログを Axiom に Log Drain 連携 |
| Resend Webhook | `/api/webhook/resend` 経由で配信イベントを受信し Axiom に転送 |
| Claude API ログ | 呼び出しごとに `input_tokens, output_tokens, estimated_cost_usd` を記録 |
| 個人情報除外 | メール / 氏名 / IP は平文で記録せず、必要に応じてハッシュ化 |

詳細は各ドキュメントの「計測実装メモ」章を参照。

---

## 5. レビュー・更新サイクル

各ドキュメント個別の 6 章（または 7 章）に記載のサイクルに加え、横断レビューを実施。

| 頻度 | 内容 | 担当 |
| :---- | :---- | :---- |
| リリース後 1 ヶ月 | 全 SLO の実測と目標の乖離を統合レビュー | 瞳子 |
| 月次 | 各ドキュメントのサイクルに沿って個別レビュー | 瞳子 |
| 半年ごと | 本ドキュメント群全体の妥当性レビュー（プロダクト成長フェーズに応じた見直し） | 瞳子 + 福田 |

---

## 6. 関連

- `02-security-requirements.md` 6 章（既存の粗い監視・アラート定義。本ドキュメント群が詳細化）
- #5 Phase 4 親 Issue
- #45 Axiom 連携 / #46 稼働監視 / #321 マーケモニタリング基盤
