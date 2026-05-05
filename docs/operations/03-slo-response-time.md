# レスポンス時間 SLO 定義

ver1 | 2026-05-05 作成 | 担当: 瞳子

---

## 0. 位置づけ

- 関連 Issue: [#315](https://github.com/kokoshiro-dev/scout-product/issues/315)（本ドキュメントが対応）/ 親 [#310](https://github.com/kokoshiro-dev/scout-product/issues/310)
- 前提実装: [#45](https://github.com/kokoshiro-dev/scout-product/issues/45) ログ基盤 / Axiom 連携
- 受け渡し先: [#46](https://github.com/kokoshiro-dev/scout-product/issues/46) 稼働監視・アラート設定

主要ページ・API のレスポンス時間（p95 / p99）目標を定義する。エラー率は `03-slo-error-rate.md`、メール配信成功率は `03-slo-email-delivery.md` で別管理。

---

## 1. 監視対象

ユーザー体験に直結する経路を「コアパス」とし、それ以外を「一般パス」「重処理」に分類する。

### 1.1 コアパス（学生）

| 対象 | 種別 | 計測位置 | 備考 |
| :---- | :---- | :---- | :---- |
| `/` | ページ（SSR） | TTFB | 学生 LP。第一印象を左右 |
| `/student/dashboard` | ページ（SSR） | TTFB | ログイン直後の TOP |
| `/student/scout` | ページ（SSR） | TTFB | 受信スカウト一覧 |
| `/student/messages` | ページ（SSR） | TTFB | チャット一覧 |
| `/student/profile` | ページ（SSR） | TTFB | 自プロフィール |
| `src/features/student/chat/actions.ts` `sendMessage` | Server Action | 関数全体 | チャット送信 |
| `src/features/scout/actions.ts` `respondScout` | Server Action | 関数全体 | スカウト承諾・辞退 |

### 1.2 コアパス（企業）

| 対象 | 種別 | 計測位置 | 備考 |
| :---- | :---- | :---- | :---- |
| `/company/dashboard` | ページ（SSR） | TTFB | ログイン直後 |
| `/company/students` | ページ（SSR） | TTFB | 学生検索。フィルタ複合で重い想定 |
| `/company/scouts/new` | ページ（SSR） | TTFB | スカウト作成画面 |
| `/company/messages/[scoutId]` | ページ（SSR） | TTFB | チャット個別 |
| `src/features/company/app/scouts/actions.ts` `sendScout` | Server Action | 関数全体 | スカウト送信 |
| `src/features/company/app/messages/actions.ts` `sendMessage` | Server Action | 関数全体 | チャット送信 |
| `src/features/company/app/students/actions.ts` 検索系 | Server Action | 関数全体 | 学生検索の絞り込み |

### 1.3 一般パス

| 対象 | 種別 | 備考 |
| :---- | :---- | :---- |
| `/student/events`, `/student/profile/edit`, `/student/settings` 等 | ページ（SSR） | コア導線ではないが頻繁に閲覧される |
| `/company/jobs`, `/company/events`, `/company/members`, `/company/settings` 等 | ページ（SSR） | 同上 |
| `/api/student/auth/line`, `/api/student/auth/callback/line` | API Route | LINE ログインフロー |
| `/api/line/webhook` | API Route | LINE 受信。応答遅延は LINE 側でリトライされる |

### 1.4 重処理（バックグラウンド／非同期想定）

| 対象 | 種別 | 備考 |
| :---- | :---- | :---- |
| `/api/sync/profile`, `/api/sync/compai`, `/api/sync/interviewai`, `/api/sync/smartes`, `/api/sync/sugoshu` | API Route | Claude API 呼び出しを含む。秒〜十秒オーダー |
| `/api/cron/event-reminder` | Cron | バックグラウンド処理 |

---

## 2. SLO（p95 / p99 目標値）

評価窓は **24 時間ローリング** を基本とする。

### 2.1 コアパス（学生・企業共通の基準）

| 区分 | p95 目標 | p99 目標 | 備考 |
| :---- | :---- | :---- | :---- |
| ページ（SSR） | < 1.5s | < 3.0s | TTFB ベース。Core Web Vitals の LCP < 2.5s に整合 |
| Server Action（標準） | < 1.0s | < 2.0s | DB 読み書きのみ |
| Server Action（通知発火を伴う） | < 2.0s | < 4.0s | スカウト送信・チャット送信。Resend / LINE Push 同期呼び出し含む |
| 学生検索（`/company/students`） | < 2.5s | < 5.0s | フィルタ複合・ページネーション込み |

### 2.2 一般パス

| 区分 | p95 目標 | p99 目標 | 備考 |
| :---- | :---- | :---- | :---- |
| 一般 SSR ページ | < 2.0s | < 4.0s | |
| 認証 API（LINE ログイン） | < 2.0s | < 4.0s | Supabase Auth + LINE OAuth |
| LINE Webhook | < 1.0s | < 2.0s | LINE 側のタイムアウト 5s よりかなり速い水準 |

### 2.3 重処理

| 区分 | p95 目標 | p99 目標 | 備考 |
| :---- | :---- | :---- | :---- |
| 同期系 API（Claude 呼び出し含む） | < 60s | < 90s | Claude のレイテンシに引っ張られる。Anthropic クライアントタイムアウト 90s（[src/lib/anthropic/client.ts](../../src/lib/anthropic/client.ts) `REQUEST_TIMEOUT_MS`）/ route `maxDuration = 300s` |
| Cron（イベントリマインド） | < 60s | < 90s | バッチ処理 |

### 2.4 数値の根拠

- **p95 1.5s（SSR ページ）**: Google の Core Web Vitals ガイドラインで LCP "Good" が 2.5s。サーバー側 TTFB が 1.5s 以内なら、レンダリング 1s で LCP 2.5s を切れる。
- **p99 3.0s**: p95 の 2 倍が一般的なロングテール許容。
- **Server Action 1s / 2s**: ユーザー操作のレスポンス感として 1s 以内が望ましい（Nielsen UX 原則）。
- **学生検索 2.5s**: 複合フィルタ + ページネーションを含むため緩めに設定。改善余地は別途。
- **同期系 60s**: Claude API のレイテンシ実測（[src/lib/anthropic/client.ts](../../src/lib/anthropic/client.ts) コメントにある通り `max_tokens=8192` で 30〜50s）+ DB 書き込みを含む。p95 を 60s に置くことで実測値の上に最低限のヘッドルームを確保。`/api/sync/*` route は `maxDuration = 300s` 設定済み（[src/app/api/sync/profile/route.ts:8](../../src/app/api/sync/profile/route.ts#L8) ほか）、Anthropic クライアント側は 90s で打ち切るため、p99 < 90s が実質上限。

---

## 3. アラート発火条件

### 3.1 コアパス

| 区分 | Severity | 発火条件 |
| :---- | :---- | :---- |
| コア SSR ページ | P1 | p95 が **3.0s を 10 分継続** |
| コア SSR ページ | P2 | p95 が **目標値（1.5s）を 30 分継続** |
| コア Server Action（通知発火を伴う） | P1 | p95 が **5.0s を 10 分継続** |
| コア Server Action（通知発火を伴う） | P2 | p95 が **目標値（2.0s）を 30 分継続** |
| 学生検索 | P1 | p95 が **8.0s を 10 分継続** |
| 学生検索 | P2 | p95 が **目標値（2.5s）を 30 分継続** |

### 3.2 一般パス・重処理

| 区分 | Severity | 発火条件 |
| :---- | :---- | :---- |
| 一般 SSR ページ | P2 | p95 が **目標値（2.0s）を 1 時間継続** |
| LINE Webhook | P1 | p95 が **3.0s を 5 分継続**（LINE タイムアウトに近づく前に検知） |
| 同期系 API（Claude） | P2 | p95 が **目標値（60s）を 1 時間継続** |
| 同期系 API（Claude） | P1 | タイムアウト（90s 超）発生率 **5% を 10 分継続** |

### 3.3 タイムアウト監視（補助）

| 対象 | 条件 | Severity |
| :---- | :---- | :---- |
| 全 Vercel Functions | タイムアウト発生率 1% を 5 分継続 | P1 |

---

## 4. アラート通知先

`03-slo-error-rate.md` 4 章と同一基準を採用。

| Severity | 一次通知 | 二次通知 |
| :---- | :---- | :---- |
| P1 | Slack `#alerts-prod` に **@福田** メンション | 5 分以内未確認でメール |
| P2 | Slack `#alerts-prod` のみ | なし |

---

## 5. 計測実装メモ（参考、実装は #45 / #46）

| 計測対象 | 取得元 |
| :---- | :---- |
| ページ TTFB | Vercel Analytics（Speed Insights） |
| Server Action 処理時間 | アプリ層で `console.time` + 構造化ログ → Axiom |
| API Route 処理時間 | アプリ層で middleware ログ → Axiom |
| Core Web Vitals | Vercel Analytics（クライアント側） |

実測のため、Server Action と API Route には以下のログを統一フォーマットで出す前提:

```ts
// 例（疑似コード。実装は #45 で行う）
{
  level: "info",
  component: "server-action",
  name: "sendScout",
  duration_ms: 1234,
  status: "ok",
  request_id: "..."
}
```

---

## 6. レビュー・更新サイクル

| 頻度 | 内容 | 担当 |
| :---- | :---- | :---- |
| リリース直後（1 週間） | 実測 p95 / p99 と目標値の乖離を確認 | 瞳子 |
| 月次 | コアパスの p95 / p99 推移をレビュー | 瞳子 |
| 半年ごと | 目標値の見直し | 瞳子 |

---

## 7. 関連

- `03-slo-error-rate.md`（エラー率 SLO）
- `02-security-requirements.md` 6.3（既存の粗い監視・アラート定義）
- #45 Axiom 連携 / #46 稼働監視 / #316 #317 #318 #319 #52
