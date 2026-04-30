# 通知基盤 設計書

- **関連 Issue**: [#124 通知基盤（LINE通知 + アプリ内通知）](https://github.com/kokoshiro-sketch/scout-product/issues/124)
- **関連要件**: [`docs/requirements_definition.md`](../requirements_definition.md) 10.1

## 概要

イベント駆動の通知基盤。受信者の役割によって外部チャネルを使い分け、アプリ内通知（`notifications` テーブル）は両者に共通で残す。

| 受信者 | 外部チャネル | 外部チャネル設定マスター | アプリ内通知 |
|---|---|---|---|
| 学生 | LINE Messaging API（push） | （マスター無し: 種別フラグのみで制御）| 常時 INSERT |
| 企業担当者 | メール（Resend） | `company_notification_settings.line_enabled`（注） | 常時 INSERT |

> **注（企業のマスタートグル）**: 企業のマスタートグル名が `line_enabled` なのは命名上の歴史的経緯による。initial schema (20260408042148) では `email_enabled` として作成されたが migration 20260413100000 で `line_enabled` にリネームされ、その後の通知設計確定（学生 → LINE / 企業 → メール）で「企業向けメール送信のマスター」として再解釈された。実体は **企業向けメール送信の一括 ON/OFF トグル**。本 PR では追加 migration を行わずコード側で再解釈する方針（[PR #250 コメント](https://github.com/kokoshiro-dev/scout-product/pull/250#issuecomment-4349855541)）。
>
> **注（学生のマスタートグル）**: 学生側 `line_enabled` カラムは migration 20260427010000 で drop 済み。学生は種別別トグル（`scout_received` / `chat_message` / `event_reminder` / `system_announcement`）を全 OFF にすれば一括 OFF と同等になるため、別途マスターを持たない方針。

本 PR では「通知生成〜配信の土台」を整備する。各イベント（スカウト作成・チャット送信・承諾/辞退・イベントリマインド・システムお知らせ）への実配線は別 Issue で扱う。

staging 側には先行して以下の 2 ファイルが個別実装として存在する:
- [`src/features/company/app/notifications/create.ts`](../../src/features/company/app/notifications/create.ts) — 企業向けメール送信
- [`src/lib/notifications/deliver.ts`](../../src/lib/notifications/deliver.ts) — 学生向け LINE 送信スタブ

本 PR で `notify()` を全チャネルの単一窓口にしたうえで、**後続 PR で上記 2 ファイルを `notify()` 呼び出しに置き換えて削除する**運用とする（[PR #250 コメント](https://github.com/kokoshiro-dev/scout-product/pull/250#issuecomment-4349855541)）。

## スコープ

### この基盤でカバーする

- 単一の司令塔 `notify()` を呼ぶだけで、`notifications` への INSERT → 設定チェック → 外部チャネル送信（学生は LINE / 企業担当者は メール）→ `line_sent_at` 更新 まで一貫して行う
- 学生 / 企業担当者で参照する設定テーブル（`student_notification_settings` / `company_notification_settings`）を切り替える
- 学生は `line_friendships` から LINE user_id を解決
- 企業担当者は `company_members.email` からメールアドレスを解決
- メール送信は Resend（[`src/lib/resend/client.ts`](../../src/lib/resend/client.ts)）経由
- 外部チャネル送信失敗は握りつぶし、アプリ内通知は必ず残す（fail-open）

### この基盤でカバーしない

- 各イベント（スカウト作成 / チャット送信 等）での `notify()` の呼び出し配線
- 通知一覧・通知設定の画面（#114 / #121）
- LINE 送信失敗時のリトライキュー
- LINE Webhook（既読ステータス受信など）
- イベントリマインドのスケジューラ（別途 cron / Edge Function を設計）

## アーキテクチャ

```
┌─────────────────────────────────────────────────┐
│ 呼び出し元（スカウト API / チャット API / 運営 管理画面 等）│
└──────────────────┬──────────────────────────────┘
                   │ notify({ userId, recipientRole, type, title, ... })
                   ▼
        ┌─────────────────────────┐
        │ src/features/notification │
        │         /lib/notify.ts     │
        └──────────────┬──────────┘
                       │
     ┌─────────────────┼──────────────────────┐
     ▼                 ▼                      ▼
 ┌────────┐     ┌──────────────┐     ┌──────────────────┐
 │settings│     │ notifications │     │resolve-line-target│
 │  .ts   │     │   INSERT      │     │  + pushLineMessage│
 │（設定取得）│   │（Service Role）│     │（LINE Messaging）│
 └────────┘     └──────────────┘     └──────────────────┘
```

### モジュール構成

| モジュール | 役割 |
|---|---|
| [`src/lib/line/messaging.ts`](../../src/lib/line/messaging.ts) | LINE Messaging API `/v2/bot/message/push` の薄いラッパ |
| [`src/lib/resend/client.ts`](../../src/lib/resend/client.ts) | Resend SDK の薄いラッパ（API キー検証 + シングルトン） |
| [`src/lib/email/notification.ts`](../../src/lib/email/notification.ts) | 通知メールの送信（Resend 呼び出し + HTML テンプレート + subject CR/LF サニタイズ） |
| [`src/features/notification/lib/types.ts`](../../src/features/notification/lib/types.ts) | `NotifyInput` / `NotifyResult` / `NOTIFICATION_TYPE_LABELS` 等の型・定数定義 |
| [`src/features/notification/lib/settings.ts`](../../src/features/notification/lib/settings.ts) | 通知設定の取得 + 種別 ON/OFF 判定 + チャネル別送信可否（`shouldSendLine` / `shouldSendEmail`） |
| [`src/features/notification/lib/resolve-line-target.ts`](../../src/features/notification/lib/resolve-line-target.ts) | 学生の LINE user_id を `line_friendships` から解決（企業担当者は常に null） |
| [`src/features/notification/lib/resolve-email-target.ts`](../../src/features/notification/lib/resolve-email-target.ts) | 企業担当者のメールアドレスを `company_members.email` から解決（学生は常に null） |
| [`src/features/notification/lib/notify.ts`](../../src/features/notification/lib/notify.ts) | 司令塔。上記を順番に呼ぶ |
| [`src/features/notification/index.ts`](../../src/features/notification/index.ts) | public エクスポート |

### `notify()` の処理フロー

1. Service Role クライアント取得
2. `recipientRole` に応じて `student_notification_settings` / `company_notification_settings` を取得
3. `notifications` に INSERT（**設定に関わらず常時実行**。アプリ内には履歴を必ず残す方針）
4. 学生 (`recipientRole = "student"`) で `shouldSendLine()` が true なら:
   - `line_friendships`（`student_id = userId AND is_friend = true`）から LINE user_id を解決
   - 解決できれば LINE Messaging API に push
   - 送信成功した場合、step 3 で作られた notifications 行の `line_sent_at` を更新
5. 企業担当者 (`recipientRole = "company_member"`) で `shouldSendEmail()` が true なら:
   - `company_members.email` からメールアドレスを解決
   - 解決できれば Resend で通知メールを送信
6. fail-open ポリシー:
   - LINE / メール送信失敗は console.error でログし、アプリ内通知は残す
   - `line_sent_at` の UPDATE 失敗も握りつぶしてログのみ残す（LINE 送信自体は成功しているため `lineSent: true` を返す）

### アプリ内通知 (`notifications`) は常時 INSERT

ユーザーは「過去の通知をアプリ内の履歴で辿れる」前提で UI を組む方針のため、アプリ内通知を OFF にするユースケースは想定しない。`notifications` への INSERT は **設定（種別フラグ / `in_app_enabled` / `line_enabled`）に関わらず常に実行する**。

この方針の帰結:

- 種別ごとの ON/OFF（`scout_received` 等）は **外部チャネル（LINE / メール）にのみ** 適用される
- `student_notification_settings.in_app_enabled` / `company_notification_settings.in_app_enabled` カラムは現状参照されない（設定 UI も「外部チャネルだけ ON/OFF」を提供する想定）。カラム自体は別 Issue で削除する想定で、本 PR では撤去まで踏み込まない
- 学生は種別フラグのみで LINE 送信可否を制御（マスター無し）
- 企業担当者は種別フラグ + マスター（`company.line_enabled`）でメール送信可否を制御

### LINE 送信の挙動（学生のみ）

| 種別フラグ（例: `scout_received`） | LINE 連携あり | 挙動 |
|:---:|:---:|---|
| ON | あり | アプリ内通知を保存 + LINE 送信し、`line_sent_at` を更新 |
| ON | なし | アプリ内通知のみ保存（`resolveLineTarget()` が null を返すため LINE 送信スキップ） |
| OFF | -    | アプリ内通知のみ保存 |

学生の「LINE 連携あり」は `line_friendships` に `is_friend = true` の行があることで判定する。bot をブロックされている等で `is_friend = false` のケースは LINE 送信をスキップする。

### メール送信の挙動（企業担当者のみ）

| 種別フラグ（例: `scout_accepted`） | マスター（`company.line_enabled`） | `company_members.email` 解決 | 挙動 |
|:---:|:---:|:---:|---|
| ON | ON | 取得できる | アプリ内通知を保存 + メール送信 |
| ON | ON | 取得できない | アプリ内通知のみ保存（`resolveEmailTarget()` が null を返すためメール送信スキップ） |
| ON | OFF | -    | アプリ内通知のみ保存 |
| OFF | -    | -    | アプリ内通知のみ保存 |

## 設定行の扱い

`notify()` は **設定行が存在しなくても動作する**。[`settings.ts`](../../src/features/notification/lib/settings.ts) の各判定関数は設定行が `null` の場合に `?? true` でデフォルト ON として扱うため、行が未生成のユーザーには全通知が届く（fail-open）。

### 現状の方針（本 PR）

- 設定行は DB トリガで自動生成しない
- `?? true` フォールバックで関数レベルでは動作可能
- 設定 UI（別 Issue [#114](https://github.com/kokoshiro-sketch/scout-product/issues/114) / [#121](https://github.com/kokoshiro-sketch/scout-product/issues/121)）が行を UPSERT する責務を持つ前提

### 設定 UI 側の実装責務（別 Issue 担当者向け）

- **初回オープン時**: 設定行が無ければ全フラグ ON で UI を初期化する
- **保存時**: `INSERT ... ON CONFLICT DO UPDATE`（UPSERT）で書き込む
- 単純な UPDATE では行が無い場合に黙って失敗するため、必ず UPSERT を使うこと

### Issue の実装順序に関する注意

[本 PR] `notify()` 関数化 → [Issue α] 各イベントから notify() を呼ぶ配線 → [Issue β] 設定 UI、という順番で α が β より先に staging に乗ると、ユーザーが通知を OFF にする手段が無い期間が生まれる。**β（設定 UI）を α（配線）より先または同時にリリースする運用ルールとする**。

### 将来の検討事項

「明示的に ON しない限り通知 OFF」という default OFF への方針変更が発生した場合、`?? true` を `?? false` に切り替えると既存ユーザー全員が突然 OFF になる。安全に migrate するには、その時点で `students` / `company_members` への `AFTER INSERT` トリガによるデフォルト行自動生成（`SECURITY DEFINER` で RLS バイパス、`ON CONFLICT DO NOTHING` で冪等化）と既存行のバックフィルを再導入することを想定する。「LINE OFF にしているユーザー数」のような監査クエリが必要になった場合も同様。

## 通知種別と対応カラム

| 通知種別 (`notification_type`) | 学生が受ける？ | 企業担当者が受ける？ | 種別 ON/OFF カラム |
|---|:---:|:---:|---|
| `scout_received` | ○ |   | `student.scout_received` |
| `scout_accepted` |   | ○ | `company.scout_accepted` |
| `scout_declined` |   | ○ | `company.scout_declined` |
| `chat_new_message` | ○ | ○ | 両方 `chat_message` |
| `event_reminder` | ○ | ○ | 両方 `event_reminder`（企業側は migration 20260429100000 で追加）|
| `system_announcement` | ○ | ○ | 両方 `system_announcement` |

役割と type の組み合わせが不整合（例: 学生に `scout_accepted` を送ろうとする）な場合、`shouldSendLine()` / `shouldSendEmail()` は `false` を返し外部チャネル送信は行わない。アプリ内通知（`notifications` への INSERT）は実行されるため、不整合な呼び出しは履歴として残る点に注意（`isTypeEnabled()` 側で防ぐべき責務）。

## セキュリティ

- `notifications` への INSERT は RLS により **Service Role のみ**。`notify()` は必ず `createAdminClient()` 経由で使う（Route Handler / Server Action / Edge Function 等、サーバー側からのみ呼び出し可能）
- `notifications` の UPDATE は `is_read` / `read_at` のみ `GRANT` されている。`line_sent_at` 等を通常ユーザーが書き換えることはできない
- `line_friendships` は学生本人のみ `SELECT` 可、INSERT/UPDATE/DELETE は Service Role 限定（migration 20260416 参照）。`notify()` からの読み出しも Service Role 経由
- `company_members.email` の SELECT は Service Role 必須（resolveEmailTarget は admin client 経由）
- メール件名は `[\r\n]+` を空白に置換してメールヘッダーインジェクションを防ぐ（[`src/lib/email/notification.ts`](../../src/lib/email/notification.ts) 参照）。本文 HTML はユーザー入力由来の文字列を `escapeHtml()` でエスケープして XSS を防ぐ

## 必要な環境変数

```
# LINE Login（既存）
LINE_LOGIN_CHANNEL_ID=...
LINE_LOGIN_CHANNEL_SECRET=...

# LINE 公式アカウント / Messaging API
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...

# Resend（メール通知: 企業担当者向け）
RESEND_API_KEY=...
EMAIL_FROM=ScoutLink <noreply@your-domain.example>
```

`LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` は LINE Developers コンソールの **Messaging API チャネル**（LINE Login チャネルとは別）の **長期チャネルアクセストークン** を指定する。`LINE_CHANNEL_SECRET` は同チャネルの Webhook 署名検証用。

`RESEND_API_KEY` は [Resend](https://resend.com/) のサーバーサイド API キー、`EMAIL_FROM` は送信元アドレス（ドメイン認証済み推奨。未認証時は Resend デフォルトの `onboarding@resend.dev` で動作確認可能）。

## 呼び出し例（参考）

実配線は別 Issue で実装するが、想定する使い方を残しておく:

```ts
// 架空の import 例。本 PR 時点ではまだ配線されていない
import { notify } from "@/features/notification";

// スカウト作成の Route Handler 内で
await notify({
  userId: targetStudentId,
  recipientRole: "student",
  type: "scout_received",
  title: "スカウトが届きました",
  body: `${companyName} からスカウトが届きました`,
  referenceType: "scouts",
  referenceId: scoutId,
});
```

## 既知の制約・TODO

- LINE 送信失敗時のリトライは未実装。失敗したら `line_sent_at` は NULL のまま（送信されなかったことを示す）。`line_sent_at` の UPDATE 失敗時も同様に NULL のまま残るため、リトライキュー実装時はログから救済する想定
- イベントリマインドは時刻ベースの通知のため、別途スケジューラ（Vercel Cron / Edge Function）の設計が必要
- 通知文面はまだハードコードを想定。多言語化 / テンプレート集約は将来対応
