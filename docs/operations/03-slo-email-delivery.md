# メール配信成功率の監視目標

ver1 | 2026-05-05 作成 | 担当: 瞳子

---

## 0. 位置づけ

- 関連 Issue: [#318](https://github.com/kokoshiro-dev/scout-product/issues/318)（本ドキュメントが対応）/ 親 [#310](https://github.com/kokoshiro-dev/scout-product/issues/310)
- 関連: [#259](https://github.com/kokoshiro-dev/scout-product/issues/259) メール送付実装, [#279](https://github.com/kokoshiro-dev/scout-product/issues/279) Resend 送信ドメイン検証
- 前提実装: [#45](https://github.com/kokoshiro-dev/scout-product/issues/45) ログ基盤
- 受け渡し先: [#46](https://github.com/kokoshiro-dev/scout-product/issues/46) 稼働監視・アラート設定

Resend 経由のメール配信について、bounce 率・complaint 率・delivered 率の監視目標を定義する。送信 API 自体の失敗率は `03-slo-error-rate.md` の「外部 API エラー（Resend）」で別管理。

---

## 1. Resend で取得できる指標の整理

Resend ダッシュボード / Webhook で取得できる主なイベント。

| イベント | 意味 | 重大度 | 取得方法 |
| :---- | :---- | :---- | :---- |
| `email.sent` | API リクエスト受理 | — | Webhook / ダッシュボード |
| `email.delivered` | 受信側 MTA 到達 | 正常 | Webhook |
| `email.delivery_delayed` | 配信遅延（一時的失敗） | 注意 | Webhook |
| `email.bounced` | 配信不能（hard / soft） | **要監視** | Webhook |
| `email.complained` | スパム報告 | **要監視** | Webhook |
| `email.opened` | 開封（トラッキング有効時） | 参考 | Webhook |
| `email.clicked` | クリック（トラッキング有効時） | 参考 | Webhook |

### 1.1 算出する指標

| 指標 | 定義 | 説明 |
| :---- | :---- | :---- |
| **Delivered 率** | `delivered / sent` | 受信側 MTA に届いた割合 |
| **Bounce 率** | `bounced / sent` | 配信不能で戻った割合 |
| **Complaint 率** | `complained / sent` | スパム報告された割合 |
| **Delay 率** | `delivery_delayed / sent` | 配信遅延の割合 |

> Bounce は hard bounce（永続的失敗：存在しないアドレス等）と soft bounce（一時的失敗：満タン等）を区別して集計する。Resend Webhook の `bounce.subType` を用いる。

---

## 2. SLO（しきい値）

評価窓は **24 時間ローリング** および **7 日間ローリング** の二段で運用する。短期は突発的な問題、長期はリスト品質の劣化を検知。

| 指標 | 24h SLO | 7d SLO | 業界標準・SES 基準 |
| :---- | :---- | :---- | :---- |
| **Delivered 率** | ≥ 98.0% | ≥ 99.0% | 一般的に 99% 以上が健全 |
| **Hard Bounce 率** | < 2.0% | < 1.0% | AWS SES の停止基準: hard 5%。Resend 推奨: 2% 以下 |
| **Soft Bounce 率** | < 5.0% | < 3.0% | 一時的失敗の許容ライン |
| **Complaint 率** | < 0.5% | < 0.1% | AWS SES の停止基準: 0.1%。これを超えると送信ドメイン信頼性が損なわれる |
| **Delay 率** | < 5.0% | — | 一時的な配信遅延 |

### 2.1 数値の根拠

- **Complaint 0.1%（7d）**: AWS SES のサスペンド基準。Resend も大手 ESP 経由で送信するため、これを超えると IP/ドメインのレピュテーションが下がる。
- **Hard Bounce 1%（7d）**: AWS SES の警告基準（5%）の 1/5 を内部目標として設定。リスト品質を高水準で維持する。
- **Delivered 99%（7d）**: bounce + complaint の上限から逆算した最低ライン。
- **24h SLO は 7d より緩め**: 短期は突発的なメール（社内テストアドレスへの誤送信等）でブレやすいため。

---

## 3. アラート発火条件

| 指標 | Severity | 発火条件 | 備考 |
| :---- | :---- | :---- | :---- |
| Complaint 率 | **P1** | 直近 24h で **0.5% 超過** | レピュテーション毀損リスク。即時対応 |
| Complaint 率 | P2 | 直近 7d で **0.1% 超過** | 中長期傾向の劣化 |
| Hard Bounce 率 | **P1** | 直近 24h で **2.0% 超過** | 不正なリスト混入の可能性 |
| Hard Bounce 率 | P2 | 直近 7d で **1.0% 超過** | リスト品質劣化 |
| Soft Bounce 率 | P2 | 直近 24h で **5.0% 超過** | 受信側の一時障害 or リレー問題 |
| Delivered 率 | **P1** | 直近 24h で **95% 未満** | 大規模な配信不能（ドメイン認証失敗等） |
| Delivered 率 | P2 | 直近 7d で **99% 未満** | 配信品質の中長期劣化 |
| 送信失敗（API レベル） | — | `03-slo-error-rate.md` で管理 | 重複させない |

### 3.1 急増アラート（補助）

| 条件 | Severity | 備考 |
| :---- | :---- | :---- |
| 1 時間以内に bounce が **20 件以上連続発生** | P1 | 大量送信先がブラックリスト化している兆候 |
| 1 時間以内に complaint が **5 件以上発生** | P1 | レピュテーション緊急対応 |

---

## 4. アラート通知先

`03-slo-error-rate.md` 4 章と同一基準。

| Severity | 一次通知 | 二次通知 |
| :---- | :---- | :---- |
| P1 | Slack `#alerts-prod` に **@福田** メンション | 5 分以内未確認でメール |
| P2 | Slack `#alerts-prod` のみ | なし |

P1 が発火した場合は、メール送信機能を一時停止できるよう、運用手順を #46 で整備する（送信停止フィーチャーフラグの導入を検討）。

---

## 5. 計測実装メモ（参考、実装は #45 / #46）

| 取得方法 | 詳細 |
| :---- | :---- |
| **Resend Webhook** を新規 Route Handler `/api/webhook/resend` で受信 | イベントを Supabase の `email_events`（新規テーブル）に保存 |
| Axiom にも同時転送 | アラート集計は Axiom Monitor で実施 |
| Resend ダッシュボード | 手動確認・週次レビューに使用 |

`email_events` テーブル想定スキーマ:

| カラム | 型 | 備考 |
| :---- | :---- | :---- |
| id | uuid | PK |
| resend_email_id | text | Resend の email id |
| event_type | text | sent / delivered / bounced / complained 等 |
| bounce_type | text | hard / soft（bounced 時のみ） |
| recipient_email_hash | text | 個人情報保護のためハッシュ化 |
| occurred_at | timestamptz | Resend 側のイベント発生時刻 |
| received_at | timestamptz | アプリ側受信時刻 |
| raw_payload | jsonb | デバッグ用（30 日経過で削除） |

> 受信メールアドレスを平文で保存しない（個人情報の最小化原則：`02-security-requirements.md` 参照）。

---

## 6. レビュー・更新サイクル

| 頻度 | 内容 | 担当 |
| :---- | :---- | :---- |
| リリース直後（1 週間） | 実測値をもとに Resend Webhook が網羅的に取れているか確認 | 瞳子 |
| 週次 | bounce / complaint 上位の受信ドメインを確認しリスト除外候補を特定 | 瞳子 |
| 月次 | 7d SLO の達成状況をレビュー | 瞳子 |

---

## 7. 関連

- `03-slo-error-rate.md`（送信 API 自体の失敗率）
- #259 メール送付実装 / #279 送信ドメイン検証
- #45 Axiom 連携 / #46 稼働監視
- AWS SES の reputation 基準: <https://docs.aws.amazon.com/ses/latest/dg/sending-review-process.html>
