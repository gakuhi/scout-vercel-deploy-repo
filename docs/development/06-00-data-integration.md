# データ連携設計書

スカウトサービスと既存4プロダクト間のデータ連携設計。方式F（read-onlyロール + ETL）で確定。

---

## 1. アーキテクチャ概要

```
[同期ジョブ（オンデマンド + 日次 Cron、サーバーサイドのみ）]

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
- **同期トリガーはオンデマンド主体**：同時登録時・データ連携同意時・学生の手動リフレッシュ時に1ユーザー分を同期。日次 Cron は更新検知のフォールバック
- **ユーザー突合はメールアドレス**で行う

### 二重の防御

1. **read-onlyロール**: 各プロダクトDBへの書き込みリスクがゼロ。キー漏洩時も読み取りのみ
2. **ETL + スカウトDBのRLS**: データをスカウトDBに入れることで、RLSによるアクセス制御がDBレベルで強制される。「学生は自分のデータだけ」「企業は同意済みの学生だけ」がコードではなくRLSで保証される

直接クエリ方式だとアクセス制御がアプリケーションコード依存になり、バグ1つで他人のデータが見えるリスクがある。ETLでスカウトDBに入れることでRLSがセーフティネットとして機能する。

---

## 2. 連携対象プロダクト

| プロダクト | DB基盤 | 接続方式 | read-only の実現方法 |
|---|---|---|---|
| **面接練習AI** | Supabase (PostgreSQL) | PostgreSQL Transaction Pooler（6543） | カスタムロール（`scout_reader`）を作成し SELECT 権限のみ付与 |
| **企業分析AI** | Supabase (PostgreSQL) | PostgreSQL Transaction Pooler（6543） | 同上 |
| **スマートES** | PlanetScale (MySQL) | `@planetscale/database`（HTTP経由） | ブランチパスワード作成時に Read-only ロール指定 |
| **すごい就活** | Bubble | Bubble Data API | API 自体が読み取り専用 |

### Supabase（面接AI・企業分析AI）の read-only ロール作成

各プロダクトの Supabase SQL Editor で1回実行する。GRANT 対象は **ETL が実際に読むテーブルに限定** する（`ALL TABLES` + `DEFAULT PRIVILEGES` だとプロダクト側が新規追加した機密テーブルにも権限が波及するため）。

**面接練習AI**:
```sql
CREATE ROLE scout_reader WITH LOGIN PASSWORD 'secure_password_here';
GRANT USAGE ON SCHEMA public TO scout_reader;

GRANT SELECT ON
  user_profiles,
  interview_sessions,
  companies,
  user_company_searches
TO scout_reader;
```

**企業分析AI**:
```sql
CREATE ROLE scout_reader WITH LOGIN PASSWORD 'secure_password_here';
GRANT USAGE ON SCHEMA public TO scout_reader;

GRANT SELECT ON
  profiles,
  researches,
  research_messages
TO scout_reader;
```

**`auth.users` への GRANT を行わない理由**:
面接練習AI・企業分析AI ともにメールアドレスは `auth.users.email` にしか存在しないが、Supabase の仕様上 `auth` スキーマへの外部ロール（`scout_reader`）の `GRANT USAGE` は実質的に不可能（`auth` スキーマの所有者は `supabase_auth_admin`、`postgres` ロールは `USAGE WITH GRANT OPTION` を保持していないため WARNING のみ出して無視される）。そのため email は DB 直読みではなく、同時登録リダイレクトの URL パラメータ経由でプロダクト側サーバーから HMAC 署名付きで受け取る方式に統一する（詳細は [08-product-side-tasks.md](./08-product-side-tasks.md) のリダイレクトURL仕様）。

### 接続方式: Transaction Pooler（6543）

接続文字列の形式: `postgresql://scout_reader.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres`

Supabase Dashboard → Settings → Database → **Connection pooling (Transaction mode)** に表示される接続文字列のユーザー名・パスワード部分を `scout_reader` 用に差し替える。

**Direct Connection（5432）ではなく Transaction Pooler を採用する理由**:
- スカウトは Vercel Serverless Functions から接続するため、Direct Connection だと関数実行ごとに接続を張って枯渇しやすい
- Transaction Pooler 経由なら Supavisor が接続プールを管理し、プロダクト側 DB の接続数への影響を最小化できる
- ETL は単純な SELECT + UPSERT のみで、Transaction Pooler の制約（prepared statement 不可、session 設定不可、LISTEN/NOTIFY 不可）に抵触しない。PostgreSQL クライアントは `prepare: false` オプションを付けて利用する

※ Supabase JS クライアント（PostgREST）経由ではカスタムロールは使えない。PostgreSQL プロトコル接続のみ。

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

### 同期トリガー

各プロダクトの同期は以下のタイミングで実行される。オンデマンドを主体とし、日次 Cron はフォールバック。

| トリガー | 対象範囲 | タイミング |
|---|---|---|
| **同時登録時** | 呼び出し元プロダクトの当該ユーザー1名分 | プロダクト→スカウトの同時登録フロー中（LINE 認証完了後） |
| **データ連携同意時** | 連携対象プロダクトの当該ユーザー1名分 | 学生がスカウト上で「データ連携に同意」した瞬間 |
| **学生の手動リフレッシュ** | 連携対象プロダクトの当該ユーザー1名分 | 学生ダッシュボードの「最新データに更新」ボタン押下時 |
| **日次バッチ** | 連携対象プロダクトの **同意済み全ユーザー分** | 毎日 03:00 JST に Vercel Cron で実行 |

**日次バッチの役割**: プロダクト側で発生した更新のうち、オンデマンドの3トリガーで拾えない分（例: 学生がスカウトに再ログインしない期間に他プロダクトで発生した更新）をフォローする。差分同期なので負荷は小さい。

### 実行基盤: Next.js Route Handler

Next.js App Router の Route Handler を同期エンドポイントとして実装する。

- 技術スタックが Next.js 内で統一される（別ランタイム不要）
- 差分同期なので1回あたりのデータ量は小さく、Vercel Pro の関数実行時間制限（60秒）内に収まる
- チーム全員が Next.js を書ける前提なのでメンテしやすい
- 呼び出し元は以下の2系統:
  - **オンデマンド**: スカウト内部のサーバーサイドコード（同時登録 API、同意完了 API、手動リフレッシュ API）から同期ロジックを呼ぶ
  - **日次**: Vercel Cron から同じ Route Handler を叩く

※ Supabase Realtime（Database Webhook）によるリアルタイム同期は、read-only ロールでは利用できない（Realtime は Supabase JS クライアント + anon/service_role キー経由でのみ動作するため）。より低レイテンシが必要になった場合は、プロダクト側に Database Webhook 設定を依頼する方式への拡張を検討する。

### エンドポイント構成

プロダクトごとに独立した Route Handler を持つ。

| エンドポイント | ソース | 接続方式 |
|---|---|---|
| `POST /api/sync/smartes` | PlanetScale | `@planetscale/database`（HTTP） |
| `POST /api/sync/interviewai` | Supabase | `postgres`（Transaction Pooler 6543経由） |
| `POST /api/sync/compai` | Supabase | `postgres`（Transaction Pooler 6543経由） |
| `POST /api/sync/sugoshu` | Bubble | Bubble Data API |

リクエストボディで同期範囲を切り替える:
- `{ "external_user_id": "..." }` → そのユーザーのみ同期（オンデマンド）
- ボディなし → 同意済み全ユーザーを差分同期（日次バッチ）

認証:
- Cron 呼び出し: `Authorization: Bearer <CRON_SECRET>` ヘッダ
- スカウト内部呼び出し: Route Handler 内で直接関数を import するか、内部 API の共通認証を利用

```
src/lib/sync/smartes.ts       ← 取得・変換・書き込みロジック（1ユーザー分 / 全ユーザー分の両対応）
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
    { "path": "/api/sync/smartes",     "schedule": "0 18 * * *" },
    { "path": "/api/sync/interviewai", "schedule": "0 18 * * *" },
    { "path": "/api/sync/compai",      "schedule": "0 18 * * *" },
    { "path": "/api/sync/sugoshu",     "schedule": "0 18 * * *" }
  ]
}
```

※ Vercel Cron は UTC 指定。`0 18 * * *` = 毎日 03:00 JST。

### 同期フロー

**オンデマンド同期（1ユーザー分）**:
```
トリガー（同時登録 / 同意 / 手動リフレッシュ）
    → POST /api/sync/{product} { external_user_id }
    → プロダクト DB から当該ユーザー分を SELECT（read-only）
    → synced_* テーブルの形に変換
    → スカウト Supabase に UPSERT（Service Role Key）
    → 呼び出し元に完了/失敗を返す（同期的）
```

**日次同期（同意済み全ユーザー分）**:
```
Vercel Cron（毎日 03:00 JST）
    → POST /api/sync/{product}（ボディなし）
    → CRON_SECRET で認証
    → student_product_links から同意済みユーザーの external_user_id 一覧を取得
    → プロダクト DB から差分 SELECT（前回 synced_at 以降）
    → synced_* テーブルに UPSERT
    → 結果を JSON で返す
```

### ユーザー体験上の注意点

- **同時登録・同意時の同期**: 学生を待たせる状態で実行されるため、レスポンス時間が UX に直結する。Bubble（すごい就活）は 1リクエスト 2-3秒かかるため、同時登録時は最小限のプロフィール取得にとどめ、本格的な同期は登録完了後のバックグラウンドに回す等の検討が必要
- **手動リフレッシュ**: ローディング表示を出し、同期中は重複クリックを無効化する
- **同意前のユーザー**: プロダクト DB から一切取得しない（プライバシー・契約上の配慮）

### エラーハンドリング

- 各プロダクトの同期は独立したエンドポイント。1つが失敗しても他に影響しない
- 各エンドポイント内でもテーブルごとに `Promise.allSettled` で独立実行
- オンデマンド同期の失敗: 呼び出し元にエラーを伝え、ユーザーに「データ取得に失敗しました。もう一度お試しください」を表示。部分成功（一部テーブルだけ取得できた）は `synced_at` を更新せず次回リトライ可能にしておく
- 日次 Cron の失敗: ログに記録し、次回実行でリトライ
- 連続失敗時はアラート通知（Vercel Logs または Supabase の `audit_logs`）

---

## 4. 取得データ詳細

スキーマ定義の正は [03-00-schema.md](./03-00-schema.md) のテーブル詳細セクション。本節は **どのソースカラムをどの synced_* カラムに入れるか** のマッピング表。

### 4.1 面接練習AI（interviewai）

**元テーブル**: `user_profiles`, `interview_sessions` + `companies`, `user_company_searches` + `companies`

※ 面接練習AI には `public.users` テーブルが存在せず、`user_profiles` にもメールアドレス列がない。`auth.users` からも読めない（Supabase の仕様上 `auth` スキーマへの外部ロール GRANT 不可）ため、email は同時登録リダイレクトの URL パラメータ経由でプロダクト側から受け取る（[08-product-side-tasks.md](./08-product-side-tasks.md) 参照）。`external_user_id` と `original_created_at` は各プロダクト側の子テーブル（`interview_sessions.user_id` / `interview_sessions.created_at` など）から導出可能なため、DB 直読みでは email を含まない。

#### → `synced_interviewai_users`

| ソース | synced_* カラム | 用途 |
|---|---|---|
| リダイレクトパラメータ `source_user_id` | `external_user_id` | 突合キー |
| リダイレクトパラメータ `email` | `email` | メール突合（HMAC署名で改ざん防止） |
| （取得不可） | `original_created_at` | DB から取得できないため NULL 許容とするか、同期初回受信時のタイムスタンプで代用 |

#### → `synced_interviewai_sessions`（`interview_sessions` ⨝ `companies`）

※ `interview_type` は**別テーブルではなく** `interview_sessions.interview_type` JSONB カラム。PostgreSQL の JSONB 演算子 `->>` で属性参照する（`interview_sessions.interview_type->>'type'` のように）。

| 元カラム | synced_* カラム | マッチングでの用途 |
|---|---|---|
| `interview_sessions.id` | `external_session_id` | |
| `interview_sessions.user_id` | `external_user_id` | 突合キー |
| `companies.name`（JOIN） | `company_name` | 志望企業の傾向 |
| `interview_sessions.interview_type->>'type'` | `session_type` | 個人/集団/GD |
| `interview_sessions.interview_type->>'industry'` | `industry` | 志望業界シグナル |
| `interview_sessions.interview_type->>'phase'` | `phase` | 就活の進捗度 |
| `evaluation_data.overallScore` | `overall_score` (INT) | 面接力の定量指標 |
| `evaluation_data.categories` | `skill_scores` (JSONB) | カテゴリ別スコア + 強み + 改善点（`qaSkill` / `responseContent` / `logicalStructure` 各々に `score`, `strengths`, `improvements` を保持）。JSON をそのままコピー |
| `evaluation_data.strengths` | `strengths` (JSONB) | 全体の強み |
| `evaluation_data.areasForImprovement` | `areas_for_improvement` (JSONB) | 全体の改善点 |
| `evaluation_data.growthHint` | `growth_hint` | 成長アドバイス |
| `conversation_text` | `conversation_text` (JSONB) | 会話トランスクリプト |
| `interview_sessions.started_at` | `started_at` | |
| `interview_sessions.created_at` | `original_created_at` | |

**取得しないデータ**: `generative_ai_config`（システム設定）、`evaluation_data.nextSteps`（次回練習ステップ提案。学生個人の練習用でマッチング無関係）、`evaluation_data.recommendFrequency`（推奨練習頻度。同上）、`evaluation_data.evaluatedAt` / `evaluation_data.evaluationModel`（評価メタ情報）

#### → `synced_interviewai_searches`（`user_company_searches` ⨝ `companies`）

| 元カラム | synced_* カラム | 用途 |
|---|---|---|
| `user_company_searches.id` | `external_search_id` | |
| `user_company_searches.user_id` | `external_user_id` | 突合キー |
| `companies.name`（JOIN） | `company_name` | 興味のある企業 |
| `user_company_searches.searched_at` | `searched_at` | |

### 4.2 企業分析AI（compai）

**元テーブル**: `profiles`, `researches`, `research_messages`

※ `profiles` に email 列が存在せず、`auth.users` も Supabase 仕様により外部ロールから読めないため、email は同時登録リダイレクトのURLパラメータ経由で取得する（面接AI と同様、[08-product-side-tasks.md](./08-product-side-tasks.md) 参照）。`profiles.id` は内部採番の `bigint` だが、`profiles.user_id` が `auth.users.id` と同じ UUID で FK されているため、リダイレクトの `source_user_id` は `profiles.user_id` と突合する（`researches.user_id` / `research_messages` 経由も同じ UUID）。

#### → `synced_compai_users`

| ソース | synced_* カラム | 用途 |
|---|---|---|
| リダイレクトパラメータ `source_user_id`（= `profiles.user_id` = `auth.users.id`） | `external_user_id` | 突合キー |
| リダイレクトパラメータ `email` | `email` | メール突合（HMAC署名で改ざん防止） |
| `profiles.created_at` | `original_created_at` | `profiles` は GRANT 済みなので DB から取得 |

#### → `synced_compai_researches`

| 元カラム | synced_* カラム | マッチングでの用途 |
|---|---|---|
| `researches.id` | `external_research_id` | |
| `researches.user_id` | `external_user_id` | 突合キー |
| `researches.title` | `title` | 調べた企業・トピック |
| `researches.url` | `url` | |
| `researches.content` | `content` | AI分析結果 |
| `researches.raw_content` | `raw_content` | 元の生データ |
| `researches.is_bookmarked` | `is_bookmarked` | |
| `researches.status` | `status` | |
| `researches.created_at` | `original_created_at` | |

**取得しないデータ**: `perplexity_id`, `model`, `tokens_used`, `plan_tier`（システム内部情報）、`citations`（実データは配列ではなく URL 単体を JSON string で保持しており、マッチングでの利用価値が低いため除外。`synced_compai_researches.citations` カラムは残すが ETL では書き込まない）、`deleted_at IS NOT NULL` のレコードはETLで除外

#### → `synced_compai_messages`

| 元カラム | synced_* カラム | 用途 |
|---|---|---|
| `research_messages.id` | `external_message_id` | |
| `research_messages.research_id` | `external_research_id` | research紐付け |
| `researches.user_id`（JOIN） | `external_user_id` | 突合キー |
| `research_messages.content` | `content` | 質問内容 |
| `research_messages.sender_type` | `sender_type` | user / assistant |
| `research_messages.created_at` | `original_created_at` | |

**取得しないデータ**: `model`, `tokens_used`（システム内部情報）、`feedback`（UI用フィードバック）

### 4.3 スマートES（smartes）

**元テーブル**: `user`, `users_generated_applicant_motivations`, `users_generated_gakuchika`, `users_generated_es`

⚠️ ETL で `user.email IS NULL` のレコードは除外する（LINE認証のみのユーザーは突合不可）。

#### → `synced_smartes_users`

| 元カラム | synced_* カラム | 用途 |
|---|---|---|
| `user.id` | `external_user_id` | 突合キー |
| `user.email` | `email` | メール突合 |
| `user.created_at` | `original_created_at` | |

#### → `synced_smartes_motivations`

| 元カラム | synced_* カラム | マッチングでの用途 |
|---|---|---|
| `users_generated_applicant_motivations.applicant_motivation_id` | `external_motivation_id` | |
| `users_generated_applicant_motivations.user_id` | `external_user_id` | 突合キー |
| 生成パラメーター（企業名等を含む） | `generated_params` (JSONB) | 志望先の傾向 |
| 生成本文 | `generated_text` | 志望動機の内容 |
| 再生成回数 | `regenerated_count` | 推敲の深さ |
| `generated_at` | `generated_at` | |
| `created_at` | `original_created_at` | |

#### → `synced_smartes_gakuchika`

| 元カラム | synced_* カラム | マッチングでの用途 |
|---|---|---|
| `users_generated_gakuchika.gakuchika_id` | `external_gakuchika_id` | |
| `users_generated_gakuchika.user_id` | `external_user_id` | 突合キー |
| 生成パラメーター | `generated_params` (JSONB) | |
| 生成元ガクチカ参照 | `original_gakuchika_list` (JSONB) | |
| 生成本文 | `generated_text` | ガクチカの内容 |
| 再生成回数 | `regenerated_count` | 推敲の深さ |

#### → `synced_smartes_generated_es`

| 元カラム | synced_* カラム | マッチングでの用途 |
|---|---|---|
| `users_generated_es.es_id` | `external_es_id` | |
| `users_generated_es.user_id` | `external_user_id` | 突合キー |
| 生成パラメーター（企業名・設問等を含む） | `generated_params` (JSONB) | 志望先・選考種別 |
| 生成元ES参照 | `original_es_list` (JSONB) | |
| 生成本文 | `generated_text` | ESの内容 |
| 再生成回数 | `regenerated_count` | 推敲の深さ |

### 4.4 すごい就活（sugoshu）

**元テーブル**: `User` + `UserProfile`, `ResumeDraft`, `UserDiagnosisSession`（Bubble Data API の型名）

probe 結果（2026-04-22 時点）から、Data API で有効化されている型のうち連携候補は `User` / `UserProfile` / `ResumeDraft` / `UserDiagnosisSession` / `CMMessage` / `CMQuestion`。前4つを ETL 対象とする。`CMMessage` / `CMQuestion` はチャット診断のやり取りで、統合プロフィールに必要であれば `UserDiagnosisSession` 経由で参照する方針（初版では未連携）。

**ユーザー突合**: `User.authentication.email.email`（Bubble 組み込み）は Data API privacy rules で外部に読めない想定。代わりに同時登録フロー時に state にメールアドレスを含めて受け取り、`student_product_links.external_user_id` に `User._id` を保存する方式で運用する（Bubble 側からの email 取得は不要）。

**probe で判明した件数（2026-04-22）**:
- `User` 518 / `UserProfile` 520 / `ResumeDraft` 655 / `UserDiagnosisSession` 1,064
- `ResumeDraft.self_pr` が非空なのは 139件（21%）のみ → マッチング対象母集団が限定される前提で設計
- `UserDiagnosisSession.result_vector` が非空なのは 756件（71%）

#### → `synced_sugoshu_users`（`User` ⨝ `UserProfile`）

| 元カラム | synced_* カラム | 用途 |
|---|---|---|
| `User._id` | `external_user_id` | 突合キー（同時登録の state に含めて受け取る） |
| state 経由で受ける email | `email` | メール突合 |
| `User.Created Date` | `original_created_at` | |

#### → `synced_sugoshu_resumes`

`ResumeDraft` は本文系（`self_pr` / `motivation` / `hobby_skill` / `personal_request`）だけでなく、氏名・住所・生年月日・連絡先・学歴 JSON・資格 JSON 等のフル PI を保持している。`UserProfile` と重複する項目が多いが、片方にしか無い情報もあるため両方同期する。

| 元カラム | synced_* カラム | マッチングでの用途 |
|---|---|---|
| `ResumeDraft._id` | `external_resume_id` | |
| `ResumeDraft.Created By` | `external_user_id` | 突合キー（User への参照。`User._id` と一致） |
| `ResumeDraft.self_pr` | `content` | 自己PR本文（マッチングの主材料） |
| `ResumeDraft.motivation` / `hobby_skill` / `personal_request` | `content` に結合 or 別カラム（後述） | 志望動機・趣味特技・その他要望 |
| `ResumeDraft.educations_json` / `certifications_json` | （今後検討） | 学歴・資格情報 |

**本文の格納方針**: `synced_sugoshu_resumes.content` は現状 TEXT 1カラムなので、複数本文フィールドをラベル付きで連結して格納する（例: `"【自己PR】...\n\n【志望動機】...\n\n【趣味特技】..."`）。学歴・資格 JSON を別カラム or JSONB で扱うかは Phase B 実装時に再検討。

#### → `synced_sugoshu_diagnoses`

| 元カラム | synced_* カラム | マッチングでの用途 |
|---|---|---|
| `UserDiagnosisSession._id` | `external_diagnosis_id` | |
| `UserDiagnosisSession.Created By` | `external_user_id` | 突合キー（User への参照） |
| `UserDiagnosisSession.result_vector` | `diagnosis_data` (JSONB) | 診断結果ベクトル（中身の構造は実データを見てから統合プロフィール生成に使う） |
| `UserDiagnosisSession.completed_at` / `Slug` | 同上 JSONB にまとめる | 完了日時・診断種別 |

---

## 5. ユーザー突合

**方式**: メールアドレスで突合。ただし email の取得経路はプロダクトごとに異なる。

```
[面接AI]      リダイレクトパラメータ email  ──┐
[企業分析AI]  リダイレクトパラメータ email  ──┼──→ students.email で照合
[スマートES]  users.email (DB 直読み) ──────┤     → student_product_links に記録
[すごい就活]  User.email  (Bubble API)  ────┘
```

- 面接AI・企業分析AI: Supabase `auth.users` は外部ロールから読めないため、同時登録時のリダイレクトURLに含まれる `email` パラメータ（HMAC 署名付き）を信頼する
- スマートES・すごい就活: プロダクト DB / API から直接 email を取得できる
- 一致するメールアドレスがあれば `student_product_links` にレコードを作成
- `product` カラムに `interviewai` / `compai` / `smartes` / `sugoshu` を記録（`product_source` enum）
- `synced_*` テーブル prefix・Route Handler パスと同じ命名で統一
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

### 方針: 同意時に初回同期 + 日次更新 + ユーザーリクエスト時の再同期

学生がデータ連携に同意した瞬間に初回同期を実行する。以降はユーザーアクション（同時登録・手動リフレッシュ）および日次 Cron で更新する。**同意前のユーザーのデータはプロダクト DB から取得しない**。

```
[学生がデータ連携に同意した瞬間]
data_consent_granted_at を記録
  → /api/sync/{product} をオンデマンド実行（1ユーザー分）
  → 統合プロフィール生成をトリガー（Claude API）
  → RLS により企業から閲覧可能に

[日次バッチ]
同意済み全ユーザーのデータを差分同期
  → 更新があれば統合プロフィール再生成

[学生の任意タイミング]
ダッシュボードの「最新データに更新」ボタン
  → /api/sync/{product} をオンデマンド実行
```

- 同意していないユーザーのデータはプロダクト DB から取得しない（プライバシー・契約上クリア）
- 同意した瞬間にすぐ企業に公開可能（統合プロフィール生成までの遅延は Claude API の処理時間のみ）
- 日次バッチがフォールバックとして機能し、ユーザー行動に依存しない更新も拾える

### プライバシー上の注意

- 利用規約・プライバシーポリシーに「同意時および以降の同期タイミングでプロダクト DB からデータを取得する」旨を明記すること
- RLS ポリシーで `data_consent_granted_at IS NOT NULL` の学生データのみ企業が閲覧可能にする
- 学生が同意を撤回した場合は `data_consent_granted_at` を NULL に戻し、統合プロフィールを削除する。以降、日次バッチの同期対象からも外れる

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

環境変数名はプロダクト識別子（`source` enum: `smartes` / `interviewai` / `compai` / `sugoshu`）に揃えてある。

| 変数名 | 用途 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | スカウトサービス Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | スカウトサービス service_role キー（同期ジョブの書き込み用） |
| `INTERVIEWAI_DB_URL` | 面接AI DB Transaction Pooler 接続（`scout_reader` ロール、6543） |
| `COMPAI_DB_URL` | 企業分析AI DB Transaction Pooler 接続（`scout_reader` ロール、6543） |
| `SMARTES_PS_HOST` | PlanetScale ホスト |
| `SMARTES_PS_USER` | PlanetScale ユーザー名（Read-only） |
| `SMARTES_PS_PASS` | PlanetScale パスワード（Read-only） |
| `SUGOSHU_BUBBLE_API_KEY` | Bubble Data API トークン（Settings → API → API Tokens で発行） |
| `SUGOSHU_BUBBLE_API_URL` | Bubble Data API ルート（末尾 `/obj` まで含める）。例: `https://sugoshu.kokoshiro.jp/version-test/api/1.1/obj` |
| `ANTHROPIC_API_KEY` | Claude API キー（統合プロフィール生成・マッチング） |
| `CRON_SECRET` | Vercel Cron 認証用 Bearer トークン（日次同期ジョブ） |

---

## 関連ドキュメント

- [06-01-data-integration-feedback-request.md](./06-01-data-integration-feedback-request.md) — 外部フィードバック依頼用資料
- [06-02-data-integration-discussion-log.md](./06-02-data-integration-discussion-log.md) — 方式検討の議事録（方式A〜Eの比較表を含む）
- [03-00-schema.md](./03-00-schema.md) — データベーススキーマ設計書
