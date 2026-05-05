# スカウト送信失敗率の監視目標

ver1 | 2026-05-05 作成 | 担当: 瞳子

---

## 0. 位置づけ

- 関連 Issue: [#317](https://github.com/kokoshiro-dev/scout-product/issues/317)（本ドキュメントが対応）/ 親 [#310](https://github.com/kokoshiro-dev/scout-product/issues/310)
- 関連: [#264](https://github.com/kokoshiro-dev/scout-product/issues/264) 通知ヘルパ配線, [#273](https://github.com/kokoshiro-dev/scout-product/issues/273) 学生通知配線
- 前提実装: [#45](https://github.com/kokoshiro-dev/scout-product/issues/45) ログ基盤
- 受け渡し先: [#46](https://github.com/kokoshiro-dev/scout-product/issues/46) 稼働監視・アラート設定

スカウト送信は「企業 → 学生」のクリティカルパスであり、送信失敗は **企業の課金行為が無に帰する** 重大事象。各処理段階を分けて失敗率を監視する。

---

## 1. 監視対象の処理段階

スカウト送信フロー（`src/features/scout/actions.ts` `sendScout` 想定）を 3 段階に分解。

```
[企業がスカウト送信ボタンクリック]
        ↓
  ① 送信 API（Server Action）
       ・Zod バリデーション
       ・RLS チェック
       ・scouts テーブル INSERT
       ・送信枠カウンタ更新
        ↓
  ② 通知発火（src/features/notification/lib/notify.ts）
       ・notification_settings 解決
       ・notifications テーブル INSERT（in-app）
       ・LINE Push 送信ジョブ enqueue
       ・email 送信ジョブ enqueue
        ↓
  ③ メール送出 / LINE 送出
       ・Resend API 呼び出し
       ・LINE Messaging API 呼び出し
       （配信成否は #318 / 別ドキュメントで管理）
```

| 段階 | 範囲 | 失敗の意味 |
| :---- | :---- | :---- |
| ① 送信 API | クリック〜scouts INSERT 完了まで | スカウト本体が DB に作成されない。最重要 |
| ② 通知発火 | scouts INSERT 後〜in-app/外部送信 enqueue まで | スカウトは作成されたが学生に通知が届かない |
| ③ 外部送出 | Resend / LINE への API 呼び出し | 通知 enqueue 済だが外部到達せず |

> 配信成功（メール delivered / LINE 既読）は本ドキュメント対象外。
> ① の API 失敗は `03-slo-error-rate.md`（Server Action error）でも集計されるが、本ドキュメントでは「スカウト固有」の失敗率として再集計する。

---

## 2. 失敗率 SLO

評価窓は **24 時間ローリング**。

| 段階 | SLO（許容失敗率） | 目標成功率 | 備考 |
| :---- | :---- | :---- | :---- |
| ① 送信 API | < 0.5% | 99.5% | 課金行為相当のため厳しめ |
| ② 通知発火（in-app + enqueue） | < 1.0% | 99.0% | DB 書き込み + 設定解決が中心 |
| ③ 外部送出（API 呼び出し） | < 2.0% | 98.0% | 外部依存があるため緩め。リトライ後の最終失敗率 |
| **End-to-end（クリック → 学生に in-app 通知到達）** | < 1.5% | 98.5% | ユーザー体験ベースの統合指標 |

### 2.1 数値の根拠

- **① 0.5%**: スカウトは企業のスカウト枠（有限・課金リソース）を消費する重要な操作。`03-slo-error-rate.md` の Server Action SLO（0.5%）と整合。
- **② 1.0%**: 通知発火は副次処理だが、学生体験のキーパス。
- **③ 2.0%**: Resend / LINE の合算。各 API は `03-slo-error-rate.md` で 1.0% / 24h を SLO としているため、合算で 2.0% を許容。
- **E2E 1.5%**: ① + ② の累積失敗率の上限近似。

---

## 3. アラート発火条件

| 段階 | Severity | 発火条件 |
| :---- | :---- | :---- |
| ① 送信 API | **P1** | 失敗率 **5% を 5 分継続** |
| ① 送信 API | P2 | 失敗率 **1% を 30 分継続** |
| ② 通知発火 | **P1** | 失敗率 **5% を 10 分継続** |
| ② 通知発火 | P2 | 失敗率 **2% を 30 分継続** |
| ③ 外部送出 | P2 | 失敗率 **5% を 30 分継続** |
| E2E | **P1** | 失敗率 **5% を 10 分継続** |

### 3.1 突発検知（補助）

| 条件 | Severity | 備考 |
| :---- | :---- | :---- |
| ① の連続失敗 **5 件以上**（5 分以内） | P1 | 機能ダウンを早期検知 |
| ② で `notification_settings` 解決失敗が **連続 10 件以上** | P1 | `03-03-notification-design.md` の前提が崩れている兆候 |

### 3.2 失敗種別の集計

P1/P2 とは別に、**失敗種別ごとの構成比**を 24h で集計しダッシュボード化。原因把握の効率化のため。

| 失敗種別の例 | 想定原因 | 一次切り分け先 |
| :---- | :---- | :---- |
| `validation-error` | 企業側 UI のバリデーション漏れ | フロント |
| `quota-exceeded` | 送信枠超過 | 仕様確認（プラン） |
| `db-error` | RLS 拒否 / 接続失敗 | DB / RLS |
| `notification-resolve-error` | 通知設定取得失敗 | 通知設計 |
| `external-api-error` | Resend / LINE 障害 | 外部依存 |

---

## 4. アラート通知先

`03-slo-error-rate.md` 4 章と同一基準。

| Severity | 一次通知 | 二次通知 |
| :---- | :---- | :---- |
| P1 | Slack `#alerts-prod` に **@福田** メンション | 5 分以内未確認でメール |
| P2 | Slack `#alerts-prod` のみ | なし |

スカウトは課金行為に直結するため、**P1 発火時は同時に企業向けの不具合周知（運営判断）** を検討する運用を #46 で整備。

---

## 5. 計測実装メモ（参考、実装は #45 / #46）

統一構造化ログのフィールド例:

```ts
// 段階ごとに stage を分けて出す（疑似コード。実装は #45 / #46）
{
  level: "info" | "error",
  component: "scout",
  stage: "send-api" | "notify" | "external",
  status: "ok" | "error",
  failure_reason: "validation-error" | "quota-exceeded" | "db-error" | "notification-resolve-error" | "external-api-error",
  scout_id: "...",
  company_id: "...",
  duration_ms: 123,
  request_id: "..."
}
```

E2E 成功は `stage: "notify"` の `status: "ok"` をもって判定する（in-app 通知到達 = 学生が見られる状態）。

---

## 6. レビュー・更新サイクル

| 頻度 | 内容 | 担当 |
| :---- | :---- | :---- |
| リリース後 1 週間 | 段階ごとの実測失敗率を確認・SLO 調整 | 瞳子 |
| 月次 | E2E 失敗率と原因種別の構成比をレビュー | 瞳子 |

---

## 7. 関連

- `03-slo-error-rate.md`（Server Action / 外部 API のレイヤー別失敗率）
- `03-slo-email-delivery.md`（メール配信成功率）
- `03-03-notification-design.md`（通知設計の前提）
- #264 通知ヘルパ配線 / #273 学生通知配線
- #45 Axiom 連携 / #46 稼働監視
