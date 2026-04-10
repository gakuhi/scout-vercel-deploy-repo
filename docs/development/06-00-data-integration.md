# データ連携設計書

スカウトサービスと既存4プロダクト間のデータ連携設計。方式F（read-onlyロール + ETL）で確定。

---

## 1. アーキテクチャ概要

```
[同期ジョブ（Vercel Cron、サーバーサイドのみ）]

面接AI (Supabase)     ←─ scout_reader ロール（SELECT のみ）
企業分析AI (Supabase) ←─ scout_reader ロール（SELECT のみ）
スマートES (PlanetScale) ←─ Read-only パスワード（SELECT のみ）
すごい就活 (Bubble)   ←─ Bubble Data API（読み取りのみ）

    ↓ 必要なカラムだけ抜いて

スカウト DB の synced_* テーブルに保存

[ユーザーのアクセス]

学生 / 企業 → スカウト DB（synced_* / student_integrated_profiles）
    → スカウト DB の RLS が適用される
    → 各プロダクト DB には一切触れない
```

### 設計原則

- **各プロダクトDBへの接続はread-only**（書き込みリスクゼロ）
- **各プロダクトDBへの接続はサーバーサイドの同期ジョブのみ**（クライアントから直接アクセスしない）
- **ユーザーが参照するのはスカウトDBのみ**（RLSで保護）
- **差分同期**：前回の `synced_at` 以降の新規・更新分のみ取得
- **ユーザー突合はメールアドレス**で行う

### 二重の防御

1. **read-onlyロール**: 各プロダクトDBへの書き込みリスクがゼロ。キー漏洩時も読み取りのみ
2. **ETL + スカウトDBのRLS**: データをスカウトDBに入れることで、RLSによるアクセス制御がDBレベルで強制される。「学生は自分のデータだけ」「企業は同意済みの学生だけ」がコードではなくRLSで保証される

直接クエリ方式だとアクセス制御がアプリケーションコード依存になり、バグ1つで他人のデータが見えるリスクがある。ETLでスカウトDBに入れることでRLSがセーフティネットとして機能する。

---

## 2. 連携対象プロダクト

| プロダクト | DB基盤 | 接続方式 | read-only の実現方法 |
|---|---|---|---|
| **面接練習AI** | Supabase (PostgreSQL) | PostgreSQL 直接接続 | カスタムロール（`scout_reader`）を作成し SELECT 権限のみ付与 |
| **企業分析AI** | Supabase (PostgreSQL) | PostgreSQL 直接接続 | 同上 |
| **スマートES** | PlanetScale (MySQL) | `@planetscale/database`（HTTP経由） | ブランチパスワード作成時に Read-only ロール指定 |
| **すごい就活** | Bubble | Bubble Data API | API 自体が読み取り専用 |

### Supabase（面接AI・企業分析AI）の read-only ロール作成

各プロダクトの Supabase SQL Editor で1回実行する。

```sql
-- スカウト連携用の読み取り専用ロールを作成
CREATE ROLE scout_reader WITH LOGIN PASSWORD 'secure_password_here';

-- public スキーマの全テーブルに SELECT 権限を付与
GRANT USAGE ON SCHEMA public TO scout_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO scout_reader;

-- 今後作成されるテーブルにも自動で SELECT 権限を付与
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO scout_reader;
```

接続文字列: `postgresql://scout_reader:password@db.<project-ref>.supabase.co:5432/postgres`

※ Supabase JS クライアント（PostgREST）経由ではカスタムロールは使えない。PostgreSQL 直接接続のみ。

### PlanetScale（スマートES）の Read-only パスワード

PlanetScale ダッシュボードでブランチパスワードを新規作成する際に、ロールを **Read-only** に指定する。

- PlanetScale は `GRANT`/`REVOKE` をサポートしていないため、テーブル単位のアクセス制限はできない
- Read-only ロールは SELECT のみ許可（INSERT/UPDATE/DELETE/DDL 不可）
- 一度作成したパスワードのロールは変更不可
- 接続タイプは **Replica**（本番DBに負荷をかけない）を推奨

### Bubble（すごい就活）

Bubble Data API で取得。API 自体が読み取り専用であり、追加の設定は不要。

- ページネーションあり（100件/リクエスト）
- レスポンスが遅い（1リクエスト 2-3秒）
- レート制限に注意

---

## 3. 同期ジョブ

### 実行基盤: Vercel Cron

Next.js の Route Handler を Vercel Cron で定期実行する。

- 技術スタックが Next.js 内で統一される（別ランタイム不要）
- 同期データ量は小さい（差分同期で数百〜数千行）ので Vercel Pro の関数実行時間制限（60秒）内に収まる
- チーム全員が Next.js を書ける前提なのでメンテしやすい
- 将来データ量が増えてタイムアウトする場合は Supabase Edge Functions や Inngest 等に移行

### 同期頻度

| プロダクト | 頻度 | 理由 |
|---|---|---|
| 面接AI | 15分おき | |
| 企業分析AI | 15分おき | |
| スマートES | 15分おき | |
| すごい就活 | 15分おき | Bubble API が遅いためリアルタイムは不可 |

※ MVP 段階では全プロダクト15分おきの Cron ポーリングで統一する。Supabase Realtime（Database Webhook）によるリアルタイム同期は、read-only ロールでは利用できない（Realtime は Supabase JS クライアント + anon/service_role キー経由でのみ動作するため）。リアルタイム性が必要になった場合は、各プロダクト側に Database Webhook の設定を依頼するか、同期頻度を上げて対応する。

### エンドポイント構成

プロダクトごとに独立した Route Handler を持つ。各エンドポイントは `CRON_SECRET` で認証する。

| エンドポイント | ソース | 接続方式 |
|---|---|---|
| `POST /api/sync/smartes` | PlanetScale | `@planetscale/database`（HTTP） |
| `POST /api/sync/interviewai` | Supabase (PostgreSQL) | PostgreSQL 直接接続 |
| `POST /api/sync/compai` | Supabase (PostgreSQL) | PostgreSQL 直接接続 |
| `POST /api/sync/sugoshu` | Bubble | Bubble Data API |

```
src/lib/sync/smartes.ts       ← 取得・変換・書き込みロジック
src/lib/sync/interviewai.ts
src/lib/sync/compai.ts
src/lib/sync/sugoshu.ts
src/app/api/sync/smartes/route.ts    ← Route Handler
src/app/api/sync/interviewai/route.ts
src/app/api/sync/compai/route.ts
src/app/api/sync/sugoshu/route.ts
```

### Vercel Cron 設定

`vercel.json`:
```json
{
  "crons": [
    { "path": "/api/sync/smartes",     "schedule": "*/15 * * * *" },
    { "path": "/api/sync/interviewai", "schedule": "*/15 * * * *" },
    { "path": "/api/sync/compai",      "schedule": "*/15 * * * *" },
    { "path": "/api/sync/sugoshu",     "schedule": "*/15 * * * *" }
  ]
}
```

### 同期フロー

```
Vercel Cron（毎15分）
    → POST /api/sync/{product}（Route Handler）
    → CRON_SECRET で認証
    → 各プロダクト DB から SELECT（Read-only）
    → レコードを synced_* テーブルの形に変換
    → スカウト Supabase に UPSERT（Service Role Key）
    → 結果を JSON で返す
```

### エラーハンドリング

- 各プロダクトの同期は独立したエンドポイント。1つが失敗しても他に影響しない
- 各エンドポイント内でもテーブルごとに `Promise.allSettled` で独立実行
- 失敗時はログを記録し、次回の Cron 実行でリトライ
- 連続失敗時はアラート通知（Vercel Logs または Supabase の `audit_logs`）

---

## 4. 取得データ詳細

### 4.1 面接練習AI

**元テーブル**: `interview_sessions`

| 取得フィールド | synced_* カラム | マッチングでの用途 |
|---|---|---|
| `evaluation_data.overallScore` | `skill_scores.overallScore` | 面接力の定量指標 |
| `evaluation_data.categories.logicalStructure.score` | `skill_scores.logicalStructure` | 論理構成力 |
| `evaluation_data.categories.qaSkill.score` | `skill_scores.qaSkill` | 質疑応答力 |
| `evaluation_data.categories.responseContent.score` | `skill_scores.responseContent` | 回答内容の質 |
| `evaluation_data.strengths` | `summary` に含める | 人物像の定性評価 |
| `evaluation_data.areasForImprovement` | `summary` に含める | |
| `interview_type.industry` | `session_type` | 志望業界シグナル |
| `interview_type.phase` | `summary` に含める | 就活の進捗度 |
| セッション数（COUNT） | 集計 | 行動量・本気度 |

**取得しないデータ**:
- `conversation_text.transcripts` — 1人最大 ~42,000トークン。`evaluation_data` で代替可能
- `generative_ai_config` — システム設定情報。マッチングに無関係

### 4.2 企業分析AI

**元テーブル**: `researches`, `research_messages`

| 取得フィールド | synced_* カラム | マッチングでの用途 |
|---|---|---|
| `researches.title`（企業名・トピック） | `title` | 調べた企業 = 興味の方向性 |
| `researches.content`（AI分析結果） | `content` | 業界理解度 |
| `researches.url` | `url` | |
| `research_messages.content`（user の質問） | 集計して取得 | 就活の軸（年収？成長性？人物像？） |
| リサーチ数（COUNT） | 集計 | 行動量 |

**取得しないデータ**:
- `research_messages` の全文（1人あたり最大 ~60,000文字）— 企業名・業界リストと質問傾向のみ取得

### 4.3 スマートES

**元テーブル**: `users_bookmarks_es`, `users_generated_applicant_motivations`

| 取得フィールド | synced_* カラム | マッチングでの用途 |
|---|---|---|
| ES本文 | `answer` | 自己PR・ガクチカの言語化 |
| 企業名・業界 | `company_name`, `industry` | 志望先の傾向 |
| 選考種別 | `selection_type` | |
| 志望動機テキスト | `question_content` / `answer` | 何を重視しているか |
| 生成・再生成回数 | 集計 | 推敲の深さ |

### 4.4 すごい就活

**元テーブル**: `UserProfile`, `ResumeDraft`, `UserDiagnosisSession`, `SessionScoreEasy/Official`, `CMQuestion`

| 取得フィールド | synced_* カラム | マッチングでの用途 |
|---|---|---|
| 氏名・大学・卒年度 | `students` の基本情報補完 | 属性フィルター |
| 履歴書内容 | `synced_activities.notes` | 自己PR等 |
| 診断結果 | `synced_activities.notes` | 自己理解 |
| SPI模試スコア | `synced_activities.notes` | 基礎学力指標 |
| 相談室の質問 | `synced_activities.event_name` | 就活の悩み・関心事 |

---

## 5. ユーザー突合

**方式**: メールアドレスで突合

```
[面接AI]      auth.users.email ──┐
[企業分析AI]  auth.users.email ──┼──→ students.email で照合
[スマートES]  users.email ───────┤     → student_product_links に記録
[すごい就活]  User.email ────────┘
```

- 一致するメールアドレスがあれば `student_product_links` にレコードを作成
- `product` カラムに `smart_es` / `company_analysis` / `interview_ai` / `sugokatsu` を記録
- 1人の学生が複数プロダクトにリンクされる

### 誤連携の防止

メールアドレス突合にはリスクがある。ユーザーAが他プロダクトにtypoしたメールアドレスで登録しており、第三者がそのアドレスを取得してスカウトサービスに登録した場合、Aのデータが第三者に紐付く可能性がある（個人情報保護法上の意図しない第三者提供に該当しうる）。

**対策: 連携データのプレビュー確認**

データ連携同意フローの中で、統合プロフィール生成前に連携されるデータの概要を学生に提示して本人確認を行う。

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

---

## 6. 同意フローとデータ公開制御

### 方針: 事前同期 + 同意後公開

全ユーザーのデータを同意の有無にかかわらず事前に同期しておく。同意前のデータは企業に開示しない。

```
[バックグラウンド: 常時]
全ユーザーのデータを synced_* テーブルに同期し続ける
  → 企業からは見えない状態

[学生が同意した瞬間]
data_consent_granted_at を記録
  → 統合プロフィール生成をトリガー（Claude API）
  → RLS により企業から閲覧可能に
```

- 同意の瞬間にデータ取得を待つ必要がない（UXが良い）
- 同期処理と同意フローが完全に分離（実装がシンプル）
- 同期の失敗・リトライがユーザー体験に影響しない

### プライバシー上の注意

- 利用規約・プライバシーポリシーに「データ連携準備のため同期する。同意前は企業に開示しない」旨を明記すること
- RLS ポリシーで `data_consent_granted_at IS NOT NULL` の学生データのみ企業が閲覧可能にする
- 学生が同意を撤回した場合は `data_consent_granted_at` を NULL に戻し、統合プロフィールを削除する

---

## 7. 統合プロフィール生成

### トリガー

- 学生が初めてデータ連携に同意したとき
- 同期データに更新があったとき（差分検知）

### Claude API への入力（1人分: ~4,500トークン）

| ソース | 渡す内容 | 推定トークン |
|---|---|---|
| 面接練習AI | スコア3種 + 強み + 改善点 + 練習業界 | ~500 |
| 企業分析AI | 調べた企業・業界リスト + 質問傾向 | ~2,000 |
| スマートES | ES要約 + 志望動機 + 志望業界 | ~1,500 |
| すごい就活 | 診断結果 + SPI + 履歴書要約 | ~500 |
| **合計** | | **~4,500** |

### 出力（`student_integrated_profiles` に保存）

| カラム | 内容 |
|---|---|
| `summary` | AIによる人物要約（200〜300文字） |
| `strengths` | 強み（JSONB配列） |
| `interests` | 興味・志望分野（JSONB配列） |
| `skills` | スキル（JSONB配列） |
| `preferred_work_locations` | 希望勤務地（JSONB配列） |
| `activity_level` | 行動量レベル（low / medium / high / very_high） |
| `generated_at` | 生成日時 |
| `model_version` | 使用モデル（例: `claude-sonnet-4-6`） |

### 生データとの比較

| | 生データ | 統合プロフィール |
|---|---|---|
| 1人あたりトークン | ~130,000+ | ~500 |
| 200人のマッチング | ~26,000,000 tok ($80+) | ~100,000 tok ($0.3) |
| 圧縮率 | | **約260倍** |

---

## 8. AIマッチング

### 方式: Claude API による直接マッチング（ベクトル検索は使わない）

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
- MVP 時点の規模（数千〜数万人）ではベクトル検索の恩恵が薄い
- **プロンプトの調整だけで評価基準を変えられる**のが最大の強み
- スケール問題が出たら Supabase の pgvector を前段フィルターとして後から追加可能

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

## 9. マッチング最適化の運用

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

## 10. 環境変数

| 変数名 | 用途 |
|---|---|
| `INTERVIEW_AI_DB_URL` | 面接AI DB 直接接続（scout_reader ロール） |
| `COMPANY_ANALYSIS_DB_URL` | 企業分析AI DB 直接接続（scout_reader ロール） |
| `SMARTES_PS_HOST` | PlanetScale ホスト |
| `SMARTES_PS_USER` | PlanetScale ユーザー名（Read-only） |
| `SMARTES_PS_PASS` | PlanetScale パスワード（Read-only） |
| `SUGOKATSU_BUBBLE_API_KEY` | Bubble API キー |
| `SUGOKATSU_BUBBLE_APP_ID` | Bubble アプリ ID |
| `ANTHROPIC_API_KEY` | Claude API キー（統合プロフィール生成・マッチング） |
| `SUPABASE_URL` | スカウトサービス Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | スカウトサービス service_role キー（同期ジョブの書き込み用） |

---

## 関連ドキュメント

- [06-01-data-integration-feedback-request.md](./06-01-data-integration-feedback-request.md) — 外部フィードバック依頼用資料
- [06-02-data-integration-discussion-log.md](./06-02-data-integration-discussion-log.md) — 方式検討の議事録（方式A〜Eの比較表を含む）
- [03-00-schema.md](./03-00-schema.md) — データベーススキーマ設計書
