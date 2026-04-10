# データ連携設計書

スカウトサービスと既存4プロダクト間のデータ連携について、検討した方式・トレードオフ・決定事項をまとめる。

---

## 1. 前提

### 1.1 連携対象プロダクトとDB基盤

| プロダクト | DB基盤 | 備考 |
|---|---|---|
| **面接練習AI** | Supabase (PostgreSQL) | Metabaseから `postgres` ロールで直接接続済み |
| **企業分析AI** | Supabase (PostgreSQL) | Metabaseから `postgres` ロールで直接接続済み |
| **スマートES** | PlanetScale (MySQL) | Scaler Pro プラン。BigQueryにもデータあり |
| **すごい就活** | Bubble | Bubble Data API のみ。リアルタイム通知手段なし |

### 1.2 ユーザー突合

**メールアドレスで突合する。**

```
[面接AI]      auth.users.email ──┐
[企業分析AI]  auth.users.email ──┼──→ students.email で照合
[スマートES]  users.email ───────┤     → student_product_links に記録
[すごい就活]  User.email ────────┘
```

#### 誤連携リスクと対策

メールアドレス突合にはリスクがある。ユーザーAが他プロダクトにtypoしたメールアドレスで登録しており、第三者がそのアドレスを取得してスカウトサービスに登録した場合、Aのデータが第三者に紐付く可能性がある（個人情報保護法上の意図しない第三者提供に該当しうる）。

**対策: 連携データのプレビュー確認**

データ連携同意フローの中で、統合プロフィール生成前に連携されるデータの概要を学生に提示し、本人確認を行う。

```
データ連携同意フロー:

1. 利用規約・プライバシーポリシーへの同意
2. 連携対象プロダクトの表示
3. 【ここ】連携データのプレビュー確認
     「以下のデータが連携されます。ご自身のデータで間違いないですか？」
       - 面接練習AI: ○回の練習記録、平均スコア○点
       - 企業分析AI: ○社の企業分析（楽天、サイバーエージェント...）
       - スマートES: ES ○件
       - すごい就活: 履歴書、診断結果
     [はい、連携する] / [自分のデータではない → 報告]
4. data_consent_granted_at を記録
5. 統合プロフィール生成
```

### 1.3 同意フロー

**方針: 事前同期 + 同意後公開**

全ユーザーのデータを同意の有無にかかわらず事前に同期（or 参照可能な状態に）しておく。同意前のデータは企業に開示しない。

- 同意の瞬間にデータ取得を待つ必要がない（UXが良い）
- 同期処理と同意フローが完全に分離（実装がシンプル）
- RLS で `data_consent_granted_at IS NOT NULL` の学生データのみ企業が閲覧可能にする
- プライバシーポリシーに「データ連携準備のため同期する。同意前は企業に開示しない」旨を明記すること

---

## 2. 連携方式の比較

### 方式A：ETL（事前同期）

各プロダクトのデータをスカウトDBの `synced_*` テーブルに定期的にコピーしておく。

```
面接AI ──Realtime/Cron──→ スカウトサーバー ──→ synced_interview_sessions
企業分析AI ──Realtime/Cron──→ スカウトサーバー ──→ synced_researches
スマートES ──Connect/Cron──→ スカウトサーバー ──→ synced_es_entries
すごい就活 ──Cron──→ スカウトサーバー ──→ synced_activities
```

| メリット | デメリット |
|---|---|
| スカウトDBだけで完結。外部DBの障害に影響されない | 同期ジョブの実装・監視・リトライ処理が必要 |
| ローカルDBから読むのでレイテンシが低い | データの鮮度が同期タイミング依存 |
| 各プロダクトのDBに負荷をかけない（同期時のみ） | synced_*テーブル4つ分のスキーマ管理が増える |
| | データの二重管理（元テーブルとsynced_*の整合性維持） |
| | 各プロダクトのDB認証情報が必要 |

#### リアルタイム同期の手段と対応状況

| プロダクト | 手段 | リアルタイム | コスト |
|---|---|---|---|
| 面接AI (Supabase) | Database Webhook (pg_net) | ✅ | $0（Pro plan内） |
| 企業分析AI (Supabase) | Database Webhook (pg_net) | ✅ | $0（Pro plan内） |
| スマートES (PlanetScale) | PlanetScale Connect (CDC) | ✅ | ~$1.50/100万行（実質月$0.07程度） |
| すごい就活 (Bubble) | なし。Vercel Cronでポーリング | ❌（15分おき） | $0 |

※ PlanetScale Connect は Scaler Pro プランで利用可能だが、**対応SinkはETLプラットフォーム（Airbyte, Debezium, Fivetran, Hightouch, Stitch）のみ。任意のHTTP Webhookには直接送れない。** スカウトサーバーへの直接CDCは不可。スマートESの連携にはread-onlyパスワードでの直接SQL、Airbyte等の経由、またはAPI層の設置が必要。

---

### 方式B：直接クエリ（service_role キー）

スカウトサーバーが各プロダクトのDBに `service_role` キーで直接SQLを叩く。synced_* テーブルは不要（すごい就活のみ例外）。

```
[統合プロフィール生成/マッチング時]
スカウトサーバー ──service_role──→ 面接AI DB（直接SELECT）
スカウトサーバー ──service_role──→ 企業分析AI DB（直接SELECT）
スカウトサーバー ──HTTP SQL──→ PlanetScale（直接SELECT）
すごい就活だけ Bubble API → synced_activities に事前同期
```

| メリット | デメリット |
|---|---|
| 実装が圧倒的にシンプル。同期ジョブ不要 | **service_role キーはRLSバイパス。漏洩=全データ流出** |
| 常に最新データが取れる | 各プロダクトDB障害時にスカウト側も影響を受ける |
| synced_*テーブルがほぼ不要 | スカウト側のバグで意図しないデータ（transcripts等）を取得するリスク |
| データの二重管理がない | スカウト側からの大量クエリが各プロダクトDBに負荷をかける可能性 |
| | **各プロダクト側が公開範囲をコントロールできない** |

---

### 方式C：直接クエリ + read-only ロール + View

各プロダクト側で連携用Viewとread-onlyロールを作成。スカウトサーバーはそのロールで接続する。

```
[各プロダクト側で事前準備]
面接AI:    scout_interview_summary View + scout_reader ロール
企業分析AI: scout_research_summary View + scout_reader ロール

[統合プロフィール生成時]
スカウトサーバー ──scout_reader──→ 各DB の View のみ参照可
```

View の作成例（面接AI側で1回実行するだけ）:

```sql
CREATE VIEW public.scout_interview_summary AS
SELECT 
  user_id,
  (evaluation_data->>'overallScore')::decimal AS overall_score,
  evaluation_data->'categories' AS category_scores,
  evaluation_data->>'strengths' AS strengths,
  evaluation_data->>'areasForImprovement' AS areas_for_improvement,
  interview_type->>'industry' AS industry,
  interview_type->>'phase' AS phase,
  started_at
FROM interview_sessions
WHERE evaluation_data IS NOT NULL;

CREATE ROLE scout_reader WITH LOGIN PASSWORD '...';
GRANT USAGE ON SCHEMA public TO scout_reader;
GRANT SELECT ON public.scout_interview_summary TO scout_reader;
```

| メリット | デメリット |
|---|---|
| 直接クエリの手軽さを維持 | 各プロダクト側でView + ロールの作成・管理が必要 |
| Viewにより不要データ（transcripts等）に物理的にアクセス不可 | 各プロダクトDB障害時にスカウト側も影響を受ける |
| キーが漏洩してもViewの範囲に被害が限定される | 各プロダクトチームとの調整・合意が必要 |
| **各プロダクト側が公開範囲をコントロールできる** | Viewの変更時にスカウト側の対応も必要 |
| **チーム間の責任分界点が明確**（渡す側が公開範囲を決める） | |
| synced_*テーブルがほぼ不要 | |

※ **PlanetScale は `GRANT`/`REVOKE` をサポートしていない**ため、スマートESにはこの方式は適用できない。スマートESには方式B（read-onlyパスワード+コードで制御）、方式A（ETL）、または方式D（API層）のいずれかを適用する。

---

### 方式D：各プロダクト側にAPI層を置く

各プロダクトがスカウト連携用のAPIエンドポイントを公開し、スカウトサーバーがHTTPで叩く。

```
面接AI:    GET /api/scout/interview-summary?user_email=xxx
企業分析AI: GET /api/scout/research-summary?user_email=xxx
スマートES: GET /api/scout/es-summary?user_email=xxx
すごい就活: Bubble Data API（既存）
```

| メリット | デメリット |
|---|---|
| 各プロダクトがデータの公開範囲を完全にコントロール | **各プロダクト側にAPI実装が必要（3プロダクト分）** |
| DBの認証情報を一切共有しない（最もセキュア） | API の可用性・パフォーマンスの管理が各プロダクトの責任になる |
| DB構造の変更がAPIの裏側に隠蔽される | レイテンシが増える（HTTP往復） |
| 認証・レート制限をAPI層で制御できる | 各プロダクトチームの開発工数が必要 |
| | API仕様の調整・バージョニングの運用コスト |

---

### 方式E：Read Replica

Supabase の Read Replica 機能を使い、物理的に書き込みできない読み取り専用DBエンドポイントを外部に提供する。

```
スカウトサーバー ──→ 面接AI Read Replica（SELECT のみ）
スカウトサーバー ──→ 企業分析AI Read Replica（SELECT のみ）
```

| メリット | デメリット |
|---|---|
| 物理的に書き込み不可。設定ミスがあっても安全 | **全テーブルが丸見え**（テーブル・カラム単位の制限不可） |
| 設定が簡単（Dashboardからポチるだけ） | **追加コスト: ~$10/月 × プロダクト数** |
| 本番DBに負荷をかけない | レプリケーション遅延（数秒〜数十秒） |
| | 各プロダクト側の公開範囲コントロールがない |
| | PlanetScale/Bubbleには適用不可（Supabase専用） |

---

## 3. 一覧比較

| | A. ETL | B. 直接クエリ | C. View+ロール | D. API層 | E. Read Replica |
|---|---|---|---|---|---|
| **実装コスト（スカウト側）** | 大 | 小 | 小 | 中 | 小 |
| **実装コスト（プロダクト側）** | なし | なし | 小 | 大 | なし |
| **セキュリティ** | △ | ✕ 全データ露出 | ○ View範囲に限定 | ◎ DB情報不要 | △ 全データ露出 |
| **データの鮮度** | △ 同期依存 | ◎ 常に最新 | ◎ 常に最新 | ◎ 常に最新 | ○ 数秒遅延 |
| **可用性（障害の独立性）** | ◎ 独立 | △ 依存 | △ 依存 | △ 依存 | ○ レプリカ独立 |
| **プロダクト側のコントロール** | ✕ | ✕ | ○ Viewで制御 | ◎ 完全制御 | ✕ |
| **責任分界点の明確さ** | △ | ✕ | **◎ 明確** | **◎ 明確** | ✕ |
| **運用の複雑さ** | 大 | 小 | 小〜中 | 中 | 小 |
| **チーム間の調整コスト** | 小 | 小 | 中 | 大 | 小 |
| **月額コスト** | ~$0 | $0 | $0 | $0 | ~$10/プロダクト |
| **PlanetScale対応** | ○ | ○ read-only pw | ✕ GRANT不可 | ○ | ✕ |
| **Bubble対応** | ○ Cronで | ✕ DB接続不可 | ✕ | ○ 既存API | ✕ |

---

## 4. プロダクト別の適用可能な方式

DB基盤の違いにより、全プロダクトに同じ方式を適用できない。

### Supabase組（面接AI・企業分析AI）

全方式（A〜E）が適用可能。

### PlanetScale（スマートES）

| 方式 | 適用可否 | 備考 |
|---|---|---|
| A. ETL | ○ | Cron ポーリング。PlanetScale Connect は対応SinkがETLプラットフォーム（Airbyte等）のみで直接Webhook不可 |
| B. 直接クエリ | ○ | read-only パスワード + `@planetscale/database` |
| C. View+ロール | **✕** | `GRANT`/`REVOKE` 非対応 |
| D. API層 | ○ | スマートES側にエンドポイント実装が必要 |
| E. Read Replica | ✕ | Supabase専用機能 |

### Bubble（すごい就活）

| 方式 | 適用可否 | 備考 |
|---|---|---|
| A. ETL | ○ | Bubble Data API + Cron。唯一の現実的な方式 |
| B〜E | ✕ | DB直接接続不可、リアルタイム通知手段なし |

**すごい就活はどの方式を選んでも Bubble Data API + Cron（synced_activities への事前同期）が必要。**

---

## 5. 各プロダクトから取得するデータ

### 5.1 取得対象（Tier 1: マッチングの核）

| プロダクト | 取得するデータ | マッチングでの用途 |
|---|---|---|
| **面接AI** | スコア3種（論理構成・質疑応答・回答内容）、総合スコア、強み、改善点、練習業界 | 面接力の定量・定性評価、志望業界シグナル |
| **企業分析AI** | 調べた企業名・業界リスト、ユーザーの質問傾向 | 興味の方向性、就活の軸 |
| **スマートES** | ES本文（自己PR・ガクチカ）、志望動機、志望業界 | 自己表現力、志望先の傾向 |
| **すごい就活** | 診断結果、SPI模試スコア、履歴書要約 | 自己理解、基礎学力 |

### 5.2 取得しないデータ（Tier 3: トークン爆弾 or 無関係）

| データ | プロダクト | 除外理由 |
|---|---|---|
| 面接の全文書き起こし（transcripts） | 面接AI | 1人最大~42,000トークン。evaluation_dataで代替可能 |
| 企業分析の全チャット履歴 | 企業分析AI | 1人最大~90,000トークン。企業名+質問傾向で代替 |
| AI設定（generative_ai_config） | 面接AI | システム情報でマッチングに無関係 |
| 証明写真 | すごい就活 | マッチングに無関係 |

※ 方式B/Eでは上記データにもアクセスできてしまう。方式C/Dではアクセス自体を制限できる。

### 5.3 実データの規模（調査結果）

#### 企業分析AI（research_messages）

- ヘビーユーザー: 1人あたり ~60,000文字（~90,000トークン）
- リサーチ数: 2〜30社/人

#### 面接練習AI（interview_sessions.evaluation_data）

- ヘビーユーザー: 1人あたり ~28,000文字（~42,000トークン）
- セッション数: 最大26回/人
- 平均スコア: 55〜68点

---

## 6. 統合プロフィール生成

どの連携方式を選んでも、**統合プロフィール（`student_integrated_profiles`）の事前生成は必須。** 生データをマッチング時に毎回Claudeに投げるとトークンコストが爆発する。

### 処理フロー

```
[データ変更時 or 定期]
各プロダクトDBから Tier 1 データを取得
    ↓
Claude API に投げる（1人あたり ~4,500トークン）
    ↓
student_integrated_profiles に保存（~500トークン相当の要約）

[マッチング時]
student_integrated_profiles だけ使う
```

### Claude APIへの入力イメージ（1人分: ~4,500トークン）

| ソース | 渡す内容 | 推定トークン |
|---|---|---|
| 面接練習AI | スコア3種 + 強み + 改善点 + 練習業界 | ~500 |
| 企業分析AI | 調べた企業・業界リスト + 質問傾向 | ~2,000 |
| スマートES | ES要約 + 志望動機 + 志望業界 | ~1,500 |
| すごい就活 | 診断結果 + SPI + 履歴書要約 | ~500 |
| **合計** | | **~4,500** |

### 生データとの比較

| | 生データ | 統合プロフィール |
|---|---|---|
| 1人あたりトークン | ~130,000+ | ~500 |
| 200人のマッチング | ~26,000,000 tok ($80+) | ~100,000 tok ($0.3) |
| 圧縮率 | | **約260倍** |

---

## 7. AIマッチング

### 方式: Claude APIによる直接マッチング（ベクトル検索は使わない）

```
企業が求人を出す / マッチング実行
    ↓
ハードフィルター（卒年、文理、勤務地）で候補を絞る
    ↓  例: 10,000人 → 80人
Claude API に投げる:
  - 求人票（自然言語）
  - 候補学生の統合プロフィール（500tok × 80人）
    ↓
Claude が各学生のマッチ度スコア + 理由を返す
    ↓
スコア順にランキングして企業に表示
```

### ベクトル検索を使わない理由

- Claude API に Embedding API がない（別サービスが必要になり技術スタックが増える）
- ベクトル類似度 ≠ マッチングの質（似た単語が多い ≠ 良いマッチ）
- MVP時点の規模（数千〜数万人）ではベクトル検索の恩恵が薄い
- **プロンプトの調整だけで評価基準を変えられる**のが最大の強み
- スケール問題が出たらSupabase の pgvector を前段フィルターとして後から追加可能

### コスト試算

| 処理 | 頻度 | トークン/回 | 月間コスト（10,000人規模） |
|---|---|---|---|
| 統合プロフィール生成 | データ同期時（新規 ~6,000人/月） | ~4,500 tok/人 | ~$90/月 |
| マッチング実行 | 企業50社 × 月3回 = 150回 | ~50,000 tok/回 | ~$30/月 |
| **合計** | | | **~$120/月（約18,000円）** |

### コスト最適化手段（将来）

| 手段 | 効果 |
|---|---|
| ハードフィルターを厳しくする | 候補数削減 → コスト比例減 |
| Haiku で一次スクリーニング → Sonnet で精密評価 | 1回のマッチング $0.07 程度に |
| マッチ結果のキャッシュ | 同じ求人×同じ学生の再計算を回避 |
| バッチ処理 | 複数学生をまとめて1リクエストで評価 |

---

## 8. マッチング最適化の運用

### フィードバックループ

```
マッチング実行 → 企業がスカウト送信 → 学生が反応
        ↑                                    ↓
  プロンプト改善 ← ← ← ← ← ← ← ← ← 結果データ蓄積
```

### 計測指標

| 指標 | データソース | 意味 |
|---|---|---|
| **承諾率**（最重要KPI） | `scouts` status=accepted / 送信数 | マッチング精度の本質的指標 |
| 開封率 | `scouts.read_at` / `scouts.sent_at` | 件名・マッチの質 |
| 辞退率 | status=declined / 送信数 | ミスマッチの度合い |
| 返信速度 | `responded_at` - `sent_at` | 学生の関心度 |
| チャット継続率 | `chat_messages` の往復数 | マッチ後の関係性の質 |

### フィードバック収集（スキーマ追加が必要）

**学生側**: スカウト辞退時に理由を1タップで選択
- 業界に興味がない
- 勤務地が合わない
- 仕事内容が合わない
- 既に内定がある
- その他

**企業側**: AIおすすめリストでのフィードバック
- スカウト送信 → 良いマッチ（暗黙的ポジティブ）
- スキップ → 弱いネガティブ
- 「合わない」ボタン → 明示的ネガティブ（理由選択付き）

### プロンプト改善サイクル

月次 or 隔週で以下を実施:

1. 承諾率・辞退率をダッシュボードで確認
2. 辞退理由の集計を見る
3. 企業の「合わない」フィードバックを分析
4. プロンプトを調整
5. マッチ結果に `prompt_version` を記録し、バージョン間で承諾率を比較

---

## 9. 環境変数（方式により異なる）

### 方式A（ETL）/ 方式B（直接クエリ）

| 変数名 | 用途 |
|---|---|
| `INTERVIEW_AI_SUPABASE_URL` | 面接練習AI Supabase URL |
| `INTERVIEW_AI_SUPABASE_SERVICE_KEY` | 面接練習AI service_role キー |
| `COMPANY_ANALYSIS_SUPABASE_URL` | 企業分析AI Supabase URL |
| `COMPANY_ANALYSIS_SUPABASE_SERVICE_KEY` | 企業分析AI service_role キー |
| `SMARTES_PS_HOST` | PlanetScale ホスト |
| `SMARTES_PS_USER` | PlanetScale ユーザー名 |
| `SMARTES_PS_PASS` | PlanetScale パスワード |
| `SUGOKATSU_BUBBLE_API_KEY` | Bubble API キー |
| `SUGOKATSU_BUBBLE_APP_ID` | Bubble アプリ ID |

### 方式C（View+ロール）

| 変数名 | 用途 |
|---|---|
| `INTERVIEW_AI_DB_URL` | 面接AI DB直接接続（scout_readerロール） |
| `COMPANY_ANALYSIS_DB_URL` | 企業分析AI DB直接接続（scout_readerロール） |
| `SMARTES_PS_HOST` | PlanetScale ホスト（read-onlyパスワード） |
| `SMARTES_PS_USER` | PlanetScale ユーザー名 |
| `SMARTES_PS_PASS` | PlanetScale パスワード |
| `SUGOKATSU_BUBBLE_API_KEY` | Bubble API キー |
| `SUGOKATSU_BUBBLE_APP_ID` | Bubble アプリ ID |

### 共通

| 変数名 | 用途 |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API キー（統合プロフィール生成・マッチング） |
