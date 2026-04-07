# スカウトサービス データベーススキーマ設計書

## 概要

既存4プロダクト（スマートES / 企業分析AI / 面接練習AI / すごい就活）の学生データを統合し、企業が学生を検索・スカウトできるプラットフォームのデータベース設計。

- **DBMS**: PostgreSQL（Supabase）
- **認証**: Supabase Auth
- **テーブル数**: 21（アプリ固有） + Supabase管理テーブル

---

## スキーマ構成

PostgreSQL の「スキーマ」はデータベース内の名前空間（namespace）。Supabase では以下のスキーマが存在する。

| スキーマ | 管理者 | 用途 |
|---|---|---|
| `public` | アプリ開発者 | アプリのテーブルを配置。RLS を適用 |
| `auth` | Supabase Auth | 認証・セッション管理（Supabase が自動作成・管理する組み込みスキーマ） |
| `storage` | Supabase Storage | ファイルストレージ管理（Supabase が自動作成・管理する組み込みスキーマ） |

**本プロジェクトのテーブルはすべて `public` スキーマに配置する。**

- PostgreSQL のスキーマはネスト（入れ子）できないフラットな構造
- `public` 内のテーブルはプレフィックスで論理グルーピングする（`student_*`, `company_*`, `scout_*`, `synced_*` など）
- MVP の規模ではスキーマ分割は不要。チームや権限が明確に分かれる規模になった場合に検討する

---

## Supabase 管理テーブル（auth / storage スキーマ）

Supabase が自動管理するテーブル。直接 CREATE/ALTER しないが、アプリ側から参照・依存する。

### auth.users — 認証ユーザー（重要）

全ユーザー（学生・企業担当者）の認証情報を管理する Supabase Auth のコアテーブル。`students.id` と `company_members.id` はこのテーブルの `id` を FK として参照する。

| カラム | 型 | 本プロジェクトでの用途 |
|---|---|---|
| id | UUID | PK。students / company_members の id と一致 |
| email | TEXT | ログイン用メールアドレス |
| raw_app_meta_data | JSONB | `role` フィールドにユーザー種別（`student` / `company_owner` / `company_admin` / `company_member`）を格納。RLS ポリシーで `auth.jwt()->>'role'` として参照 |
| raw_user_meta_data | JSONB | サインアップ時のメタデータ（氏名等）。LINE連携時は LINE プロフィール情報が自動格納される |
| created_at | TIMESTAMPTZ | アカウント作成日時 |
| updated_at | TIMESTAMPTZ | |
| last_sign_in_at | TIMESTAMPTZ | 最終ログイン日時 |
| banned_until | TIMESTAMPTZ | アカウント停止期限（不正利用対応） |

※ パスワードハッシュ（encrypted_password）等のセキュリティカラムは Supabase Auth が内部管理。アプリ層からは参照しない。

### auth.identities — OAuth プロバイダー紐付け（重要）

LINE連携・マジックリンク等の認証プロバイダー情報。1ユーザーに複数の identity を持てる（LINE + メール等）。

| カラム | 型 | 本プロジェクトでの用途 |
|---|---|---|
| id | TEXT | プロバイダー側のユーザーID |
| user_id | UUID | FK → auth.users(id) |
| provider | TEXT | `line` / `email` 等 |
| identity_data | JSONB | LINE連携時: `sub`（LINE user_id）、`name`、`picture` 等を格納。LINE通知送信時に `identity_data->>'sub'` で LINE user_id を取得 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

※ LINE通知送信時はサーバーサイド（Service Role Key）で `auth.identities` から `provider = 'line'` の `identity_data->>'sub'` を取得して LINE Messaging API に渡す。

### auth.sessions — セッション管理

アクティブセッションを管理。セキュリティ要件書 1.2 のセッション設定（タイムボックス7日、非アクティブ24時間）に従う。

### auth.mfa_factors / auth.mfa_challenges — MFA 管理

企業 owner/admin に必須の TOTP MFA の登録・認証チャレンジ情報。

### auth.flow_state — 認証フロー状態

マジックリンク・OAuth 等の認証フロー中間状態を保持。

### storage.objects / storage.buckets — ファイルストレージ

| バケット | 用途 | アクセス |
|---|---|---|
| `avatars` | 学生のプロフィール画像 | Private + 署名付きURL |
| `company-logos` | 企業ロゴ画像 | Public（審査済み企業のみアップロード可） |

※ バケット設計は開発時に確定。RLS でアップロード権限を制御。

---

## ER図（概要）

テーブルを機能グループごとに色分けして表示。リレーションの詳細は「ER図（詳細）」を参照。

```mermaid
flowchart TB
    subgraph auth["auth スキーマ（Supabase 管理）"]
        auth.users
        auth.identities
        auth.sessions
    end

    subgraph student["学生"]
        students
        student_product_links
        student_integrated_profiles
    end

    subgraph sync["データ連携（ETL）"]
        synced_es_entries
        synced_researches
        synced_interview_sessions
        synced_activities
    end

    subgraph company["企業"]
        companies
        company_members
        job_postings
        company_plans
        saved_searches
    end

    subgraph scout_chat["スカウト・チャット"]
        scouts
        chat_messages
    end

    subgraph notify["通知"]
        notifications
        student_notification_settings
        company_notification_settings
    end

    subgraph event_g["イベント"]
        events
        event_registrations
    end

    subgraph system["システム"]
        anonymous_visits
        audit_logs
    end

    %% グループ間の主要リレーション
    auth.users -- "FK" --> students
    auth.users -- "FK" --> company_members
    students -- "ETL同期" --> sync
    students -- "受信" --> scouts
    companies -- "送信" --> scouts
    scouts -- "スレッド" --> chat_messages
    students -- "申込" --> event_registrations
    events -- "登録" --> event_registrations
    companies -- "開催" --> events
    job_postings -- "紐付" --> scouts
    students -- "通知先" --> notifications
    students -- "設定" --> student_notification_settings
    company_members -- "通知先" --> notifications
    company_members -- "設定" --> company_notification_settings

    %% グループ色
    style auth fill:#e0e7ff,stroke:#6366f1,color:#3730a3
    style student fill:#dbeafe,stroke:#3b82f6,color:#1e40af
    style sync fill:#fef3c7,stroke:#f59e0b,color:#92400e
    style company fill:#d1fae5,stroke:#10b981,color:#065f46
    style scout_chat fill:#fee2e2,stroke:#ef4444,color:#991b1b
    style notify fill:#ffedd5,stroke:#f97316,color:#9a3412
    style event_g fill:#ede9fe,stroke:#8b5cf6,color:#5b21b6
    style system fill:#f3f4f6,stroke:#6b7280,color:#374151
```

## ER図（詳細）

```mermaid
erDiagram
    %% ===== 認証・プロフィール =====
    students {
        uuid id PK "auth.users(id)"
        text email
        text last_name
        text first_name
        text last_name_kana
        text first_name_kana
        text phone
        date birthdate
        text gender
        text university
        text faculty
        text department
        academic_type academic_type
        int graduation_year
        text prefecture
        text postal_code
        text city
        text street
        text profile_image_url
        text bio
        boolean is_profile_public
        timestamptz data_consent_granted_at
        timestamptz deleted_at
        timestamptz created_at
        timestamptz updated_at
    }

    companies {
        uuid id PK
        text name
        text industry
        text employee_count_range
        text website_url
        text logo_url
        text description
        text prefecture
        text postal_code
        text city
        text street
        text phone
        boolean is_verified
        timestamptz verified_at
        timestamptz deleted_at
        timestamptz created_at
        timestamptz updated_at
    }

    company_members {
        uuid id PK "auth.users(id)"
        uuid company_id FK
        text email
        text last_name
        text first_name
        company_member_role role "owner / admin / member"
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    %% ===== データ連携 =====
    student_product_links {
        uuid id PK
        uuid student_id FK
        product_source product
        text external_user_id
        timestamptz linked_at
    }

    synced_es_entries {
        uuid id PK
        uuid student_id FK
        text external_es_id
        text company_name
        text industry
        text question_content
        text answer
        text selection_type
        timestamptz original_created_at
        timestamptz synced_at
    }

    synced_researches {
        uuid id PK
        uuid student_id FK
        text external_research_id
        text title "企業名・トピック"
        text content "AI分析結果"
        text url
        timestamptz original_created_at
        timestamptz synced_at
    }

    synced_interview_sessions {
        uuid id PK
        uuid student_id FK
        text external_session_id
        text session_type
        text summary
        jsonb skill_scores
        timestamptz original_created_at
        timestamptz synced_at
    }

    synced_activities {
        uuid id PK
        uuid student_id FK
        text external_record_id
        text event_name
        text event_url
        timestamptz applied_at
        text notes
        timestamptz original_created_at
        timestamptz synced_at
    }

    %% ===== コア機能 =====
    student_integrated_profiles {
        uuid id PK
        uuid student_id FK "UNIQUE"
        text summary "AIによる人物要約"
        jsonb strengths
        jsonb interests
        jsonb skills
        text activity_level
        timestamptz generated_at
        text model_version
    }

    scouts {
        uuid id PK
        uuid company_id FK
        uuid sender_id FK
        uuid student_id FK
        text subject
        text message
        uuid job_posting_id FK "NOT NULL"
        scout_status status
        timestamptz sent_at
        timestamptz read_at
        timestamptz responded_at
        timestamptz expires_at
    }

    %% ===== 求人 =====
    job_postings {
        uuid id PK
        uuid company_id FK
        uuid created_by FK
        text title
        text description
        text job_category
        text work_location
        text employment_type
        text salary_range
        text requirements
        text benefits
        int target_graduation_year
        boolean is_published
        timestamptz published_at
        timestamptz deleted_at
        timestamptz created_at
        timestamptz updated_at
    }

    %% ===== チャット =====
    chat_messages {
        uuid id PK
        uuid scout_id FK
        uuid sender_id "auth.users(id)"
        chat_sender_role sender_role
        text content
        timestamptz read_at
        timestamptz created_at
    }

    %% ===== 通知 =====
    notifications {
        uuid id PK
        uuid user_id "auth.users(id)"
        notification_type type
        text title
        text body
        text reference_type
        uuid reference_id
        boolean is_read
        timestamptz read_at
        timestamptz line_sent_at
        timestamptz created_at
    }

    student_notification_settings {
        uuid id PK
        uuid student_id FK "UNIQUE"
        boolean scout_received
        boolean chat_message
        boolean event_reminder
        boolean system_announcement
        boolean line_enabled
        boolean in_app_enabled
        timestamptz updated_at
    }

    company_notification_settings {
        uuid id PK
        uuid company_member_id FK "UNIQUE"
        boolean scout_accepted
        boolean scout_declined
        boolean chat_message
        boolean system_announcement
        boolean line_enabled
        boolean in_app_enabled
        timestamptz updated_at
    }

    %% ===== イベント =====
    events {
        uuid id PK
        uuid company_id FK "NULLable"
        uuid created_by FK "NULLable"
        event_organizer_type organizer_type
        text title
        text description
        text event_type
        event_format format
        text location
        text online_url
        timestamptz starts_at
        timestamptz ends_at
        int capacity
        timestamptz application_deadline
        int target_graduation_year
        boolean is_published
        timestamptz published_at
        timestamptz deleted_at
        timestamptz created_at
        timestamptz updated_at
    }

    event_registrations {
        uuid id PK
        uuid event_id FK
        uuid student_id FK
        event_registration_status status
        timestamptz applied_at
        timestamptz cancelled_at
        timestamptz created_at
    }

    %% ===== トラッキング =====
    anonymous_visits {
        uuid id PK
        text session_token "UNIQUE"
        text utm_source
        text utm_medium
        text utm_campaign
        text utm_term
        text utm_content
        text referrer
        text landing_page
        text user_agent
        text ip_address
        uuid user_id
        timestamptz linked_at
        timestamptz expires_at
        timestamptz created_at
    }

    %% ===== 監査 =====
    audit_logs {
        uuid id PK
        uuid actor_id
        text actor_role
        text action
        text target_type
        uuid target_id
        jsonb details
        text ip_address
        timestamptz created_at
    }

    %% ===== MVP後 =====
    saved_searches {
        uuid id PK
        uuid company_member_id FK
        text name
        jsonb filters
        timestamptz created_at
        timestamptz updated_at
    }

    company_plans {
        uuid id PK
        uuid company_id FK "UNIQUE"
        text plan_type "free / basic / premium"
        text stripe_customer_id
        text stripe_subscription_id
        int scout_quota
        int scouts_sent_this_month
        timestamptz current_period_start
        timestamptz current_period_end
        timestamptz created_at
        timestamptz updated_at
    }

    %% ===== リレーション =====
    students ||--o{ student_product_links : "links"
    students ||--o{ synced_es_entries : "has"
    students ||--o{ synced_researches : "has"
    students ||--o{ synced_interview_sessions : "has"
    students ||--o{ synced_activities : "has"
    students ||--o| student_integrated_profiles : "has"

    students ||--o{ scouts : "receives"
    students ||--o| student_notification_settings : "configures"
    students ||--o{ notifications : "receives"
    students ||--o{ event_registrations : "registers"

    companies ||--o{ company_members : "has"
    companies ||--o{ scouts : "sends"
    companies ||--o| company_plans : "subscribes"
    companies ||--o{ job_postings : "has"
    companies ||--o{ events : "hosts"

    company_members ||--o{ scouts : "sends"
    company_members ||--o{ saved_searches : "saves"
    company_members ||--o{ job_postings : "creates"
    company_members ||--o| company_notification_settings : "configures"
    company_members ||--o{ notifications : "receives"
    company_members ||--o{ events : "creates"

    job_postings ||--o{ scouts : "referenced_by"
    scouts ||--o{ chat_messages : "has_thread"
    events ||--o{ event_registrations : "has"
```

---

## Enum型

| Enum | 値 | 説明 |
|---|---|---|
| `user_role` | `student`, `company_owner`, `company_admin`, `company_member` | ユーザー種別（auth.users の raw_app_meta_data.role に格納） |
| `company_member_role` | `owner`, `admin`, `member` | 企業内ロール（company_members.role に格納） |
| `product_source` | `smart_es`, `company_ai`, `interview_ai`, `syukatsu` | 連携元プロダクト |
| `scout_status` | `sent`, `read`, `accepted`, `declined`, `expired` | スカウトの状態遷移 |
| `academic_type` | `liberal_arts`, `science`, `other` | 文理区分 |
| `chat_sender_role` | `student`, `company_member` | チャットメッセージの送信者ロール |
| `notification_type` | `scout_received`, `scout_accepted`, `scout_declined`, `chat_new_message`, `event_reminder`, `system_announcement` | 通知種別 |
| `event_organizer_type` | `company`, `platform` | イベント主催者種別 |
| `event_format` | `online`, `offline`, `hybrid` | イベント開催形式 |
| `event_registration_status` | `applied`, `confirmed`, `cancelled`, `attended` | イベント参加ステータス |

---

## テーブル詳細

### 1. students — 学生統合プロフィール

学生の基本情報を一元管理する。`id` は Supabase Auth の `auth.users(id)` と一致。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, FK → auth.users(id) | |
| email | TEXT | NOT NULL, UNIQUE | |
| last_name | TEXT | | 姓 |
| first_name | TEXT | | 名 |
| last_name_kana | TEXT | | 姓カナ |
| first_name_kana | TEXT | | 名カナ |
| phone | TEXT | | 電話番号 |
| birthdate | DATE | | 生年月日 |
| gender | TEXT | | 性別 |
| university | TEXT | | 大学名 |
| faculty | TEXT | | 学部 |
| department | TEXT | | 学科 |
| academic_type | academic_type | | 文理区分 |
| graduation_year | INT | | 卒業年度 |
| prefecture | TEXT | | 都道府県 |
| postal_code | TEXT | | 郵便番号 |
| city | TEXT | | 市区町村 |
| street | TEXT | | 番地以降 |
| profile_image_url | TEXT | | プロフィール画像 |
| bio | TEXT | | 自己紹介文 |
| is_profile_public | BOOLEAN | DEFAULT false | 企業への公開フラグ |
| data_consent_granted_at | TIMESTAMPTZ | | データ連携同意日時 |
| deleted_at | TIMESTAMPTZ | | 論理削除日時（30日後に物理削除） |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 2. companies — 企業プロフィール

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| name | TEXT | NOT NULL | 企業名 |
| industry | TEXT | | 業界 |
| employee_count_range | TEXT | | 従業員規模（例: "101-500"） |
| website_url | TEXT | | コーポレートサイト |
| logo_url | TEXT | | ロゴ画像 |
| description | TEXT | | 企業説明 |
| prefecture | TEXT | | 都道府県 |
| postal_code | TEXT | | 郵便番号 |
| city | TEXT | | 市区町村 |
| street | TEXT | | 番地以降 |
| phone | TEXT | | 代表電話番号 |
| is_verified | BOOLEAN | DEFAULT false | 運営による審査完了フラグ |
| verified_at | TIMESTAMPTZ | | 審査完了日時 |
| deleted_at | TIMESTAMPTZ | | 論理削除日時（30日後に物理削除） |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 3. company_members — 企業担当者

企業に所属するリクルーター。`id` は Supabase Auth の `auth.users(id)` と一致。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, FK → auth.users(id) | |
| company_id | UUID | NOT NULL, FK → companies(id) | 所属企業 |
| email | TEXT | NOT NULL | |
| last_name | TEXT | | 姓 |
| first_name | TEXT | | 名 |
| role | company_member_role | DEFAULT 'member' | `owner` / `admin` / `member` |
| is_active | BOOLEAN | DEFAULT true | アカウント有効フラグ |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 4. student_product_links — プロダクト紐付け

学生アカウントと既存4プロダクトのアカウントを紐付ける。メールアドレスで自動マッチング後、学生の確認を経て作成。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| student_id | UUID | NOT NULL, FK → students(id) | |
| product | product_source | NOT NULL | 連携元プロダクト |
| external_user_id | TEXT | NOT NULL | プロダクト側のuser_id |
| linked_at | TIMESTAMPTZ | DEFAULT now() | 紐付け日時 |
| | | UNIQUE(student_id, product) | 1プロダクト1リンク |

### 🔵 5. synced_es_entries — ES データ（スマートES）

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| student_id | UUID | NOT NULL, FK → students(id) | |
| external_es_id | TEXT | | スマートES側のes_id |
| company_name | TEXT | | 対象企業名 |
| industry | TEXT | | 業界 |
| question_content | TEXT | | 設問内容 |
| answer | TEXT | | 回答内容 |
| selection_type | TEXT | | 選考種別 |
| original_created_at | TIMESTAMPTZ | | 元データの作成日時 |
| synced_at | TIMESTAMPTZ | DEFAULT now() | 同期日時 |

### 🔵 6. synced_researches — 企業分析データ（企業分析AI）

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| student_id | UUID | NOT NULL, FK → students(id) | |
| external_research_id | TEXT | | 企業分析AI側のid |
| title | TEXT | | 調査対象（企業名・トピック） |
| content | TEXT | | AI生成の分析結果 |
| url | TEXT | | 関連URL |
| original_created_at | TIMESTAMPTZ | | 元データの作成日時 |
| synced_at | TIMESTAMPTZ | DEFAULT now() | 同期日時 |

### 🔵 7. synced_interview_sessions — 面接練習データ（面接練習AI）

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| student_id | UUID | NOT NULL, FK → students(id) | |
| external_session_id | TEXT | | 面接練習AI側のsession_id |
| session_type | TEXT | | 面接タイプ（個人/集団/GD等） |
| summary | TEXT | | セッション要約 |
| skill_scores | JSONB | | スキル評価スコア |
| original_created_at | TIMESTAMPTZ | | 元データの作成日時 |
| synced_at | TIMESTAMPTZ | DEFAULT now() | 同期日時 |

### 🔵 8. synced_activities — 就活活動データ（すごい就活）

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| student_id | UUID | NOT NULL, FK → students(id) | |
| external_record_id | TEXT | | すごい就活側の応募ID |
| event_name | TEXT | | イベント・企業名 |
| event_url | TEXT | | イベントURL |
| applied_at | TIMESTAMPTZ | | 応募日時 |
| notes | TEXT | | 備考 |
| original_created_at | TIMESTAMPTZ | | 元データの作成日時 |
| synced_at | TIMESTAMPTZ | DEFAULT now() | 同期日時 |

### 🔵 9. student_integrated_profiles — AI統合プロフィール

Claude APIで4プロダクトのデータを分析し、統合的な学生プロフィールを生成・保存する。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| student_id | UUID | NOT NULL, UNIQUE, FK → students(id) | |
| summary | TEXT | | AIによる人物要約 |
| strengths | JSONB | | 強み・特性 |
| interests | JSONB | | 志望業界・企業群 |
| skills | JSONB | | スキル評価 |
| preferred_work_locations | JSONB | | 志望勤務先（例: ["東京", "大阪"]） |
| activity_level | TEXT | | 就活活動量（active/moderate/low） |
| generated_at | TIMESTAMPTZ | DEFAULT now() | 生成日時 |
| model_version | TEXT | | 使用AIモデル |

### 10. scouts — スカウトメッセージ

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| company_id | UUID | NOT NULL, FK → companies(id) | 送信元企業 |
| sender_id | UUID | NOT NULL, FK → company_members(id) | 送信者 |
| student_id | UUID | NOT NULL, FK → students(id) | 送信先学生 |
| job_posting_id | UUID | NOT NULL, FK → job_postings(id) | 紐付く求人 |
| subject | TEXT | NOT NULL | 件名 |
| message | TEXT | NOT NULL | 本文 |
| status | scout_status | DEFAULT 'sent' | 状態 |
| sent_at | TIMESTAMPTZ | DEFAULT now() | 送信日時 |
| read_at | TIMESTAMPTZ | | 既読日時 |
| responded_at | TIMESTAMPTZ | | 応答日時 |
| expires_at | TIMESTAMPTZ | | 有効期限 |

### 🔵 11. saved_searches — 検索条件保存（MVP後）

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| company_member_id | UUID | NOT NULL, FK → company_members(id) | |
| name | TEXT | NOT NULL | 検索名 |
| filters | JSONB | NOT NULL | フィルター条件 |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 🔵 12. company_plans — 課金プラン（MVP後）

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| company_id | UUID | NOT NULL, UNIQUE, FK → companies(id) | |
| plan_type | TEXT | DEFAULT 'free' | `free` / `basic` / `premium` |
| stripe_customer_id | TEXT | | Stripe顧客ID |
| stripe_subscription_id | TEXT | | StripeサブスクリプションID |
| scout_quota | INT | DEFAULT 0 | 月間スカウト上限 |
| scouts_sent_this_month | INT | DEFAULT 0 | 今月の送信数 |
| current_period_start | TIMESTAMPTZ | | 現在の課金期間開始 |
| current_period_end | TIMESTAMPTZ | | 現在の課金期間終了 |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 13. audit_logs — 監査ログ

セキュリティ上重要な操作を記録する。`internal` スキーマに配置し、クライアントからのRPCアクセスを防ぐ。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| actor_id | UUID | | 操作を行ったユーザーのID |
| actor_role | TEXT | | 操作者のロール |
| action | TEXT | NOT NULL | 操作種別（例: `role_changed`, `privacy_updated`, `scout_sent`） |
| target_type | TEXT | | 対象のテーブル名（例: `company_members`, `privacy_settings`） |
| target_id | UUID | | 対象レコードのID |
| details | JSONB | | 変更前後の値など詳細情報 |
| ip_address | TEXT | | リクエスト元IPアドレス |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 14. job_postings — 求人情報

企業が作成する求人。スカウト送信時に紐付けることで、学生に具体的なポジション情報を提示する。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| company_id | UUID | NOT NULL, FK → companies(id) | 求人を持つ企業 |
| created_by | UUID | NOT NULL, FK → company_members(id) | 作成した担当者 |
| title | TEXT | NOT NULL | 求人タイトル（例: 「26卒 エンジニア職」） |
| description | TEXT | | 募集要項・仕事内容 |
| job_category | TEXT | | 職種（例: エンジニア、営業、企画 等） |
| work_location | TEXT | | 勤務地 |
| employment_type | TEXT | | 雇用形態（正社員、契約社員 等） |
| salary_range | TEXT | | 給与帯（例: "300万-500万"） |
| requirements | TEXT | | 応募条件・求めるスキル |
| benefits | TEXT | | 福利厚生 |
| target_graduation_year | INT | | 対象卒業年度 |
| is_published | BOOLEAN | DEFAULT false | 公開フラグ |
| published_at | TIMESTAMPTZ | | 公開日時 |
| deleted_at | TIMESTAMPTZ | | 論理削除日時 |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 15. chat_messages — チャットメッセージ

スカウト承諾後の学生-企業間メッセージ。スカウト（scouts）単位のスレッド形式。

**リアルタイム配信**: Supabase Realtime（PostgreSQL の logical replication ベースの WebSocket 配信機能）を使用。`scout_id` でチャンネルをフィルタし、該当スカウトのスレッド参加者（学生・企業担当者）にのみ INSERT イベントを即時配信する。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| scout_id | UUID | NOT NULL, FK → scouts(id) | 紐付くスカウト（＝スレッド単位） |
| sender_id | UUID | NOT NULL | 送信者のユーザーID（auth.users(id)）。学生または企業担当者 |
| sender_role | chat_sender_role | NOT NULL | `student` / `company_member` |
| content | TEXT | NOT NULL | メッセージ本文 |
| read_at | TIMESTAMPTZ | | 相手に既読された日時 |
| created_at | TIMESTAMPTZ | DEFAULT now() | 送信日時 |

※ スカウトの `status` が `accepted` のときのみメッセージ送信を許可（RLS + アプリ層で二重制御）。

### 16. notifications — 通知

イベント駆動の通知レコード。LINE通知とアプリ内通知の両方で参照する。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL | 通知先ユーザー（auth.users(id)） |
| type | notification_type | NOT NULL | 通知種別 |
| title | TEXT | NOT NULL | 通知タイトル |
| body | TEXT | | 通知本文 |
| reference_type | TEXT | | 関連エンティティのテーブル名（例: `scouts`, `chat_messages`） |
| reference_id | UUID | | 関連エンティティのID |
| is_read | BOOLEAN | DEFAULT false | アプリ内既読フラグ |
| read_at | TIMESTAMPTZ | | アプリ内既読日時 |
| line_sent_at | TIMESTAMPTZ | | LINE通知送信日時（NULL = 未送信 or LINE未連携） |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 17. student_notification_settings — 学生通知設定

学生ごとの通知種別ON/OFF設定。1学生1レコード。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| student_id | UUID | NOT NULL, UNIQUE, FK → students(id) | |
| scout_received | BOOLEAN | DEFAULT true | スカウト受信通知 |
| chat_message | BOOLEAN | DEFAULT true | チャット新着通知 |
| event_reminder | BOOLEAN | DEFAULT true | イベントリマインド通知 |
| system_announcement | BOOLEAN | DEFAULT true | システムからのお知らせ |
| line_enabled | BOOLEAN | DEFAULT true | LINE通知の一括ON/OFF |
| in_app_enabled | BOOLEAN | DEFAULT true | アプリ内通知の一括ON/OFF |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 18. company_notification_settings — 企業担当者通知設定

企業担当者ごとの通知種別ON/OFF設定。1担当者1レコード。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| company_member_id | UUID | NOT NULL, UNIQUE, FK → company_members(id) | |
| scout_accepted | BOOLEAN | DEFAULT true | スカウト承諾通知 |
| scout_declined | BOOLEAN | DEFAULT true | スカウト辞退通知 |
| chat_message | BOOLEAN | DEFAULT true | チャット新着通知 |
| system_announcement | BOOLEAN | DEFAULT true | システムからのお知らせ |
| line_enabled | BOOLEAN | DEFAULT true | LINE通知の一括ON/OFF |
| in_app_enabled | BOOLEAN | DEFAULT true | アプリ内通知の一括ON/OFF |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 19. events — イベント

企業主催または運営主催のイベント（説明会・セミナー・インターン等）。`company_id` が NULL の場合はプラットフォーム運営主催。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| company_id | UUID | NULLable, FK → companies(id) | 主催企業（NULLの場合は運営主催） |
| created_by | UUID | NULLable, FK → company_members(id) | 作成した企業担当者（運営主催の場合はNULL） |
| organizer_type | event_organizer_type | NOT NULL | `company` / `platform`。`company_id` の NULL 判定でも判別可能だが、RLS やクエリで明示的にフィルタできるよう専用カラムとして持つ |
| title | TEXT | NOT NULL | イベントタイトル |
| description | TEXT | | イベント詳細・説明文 |
| event_type | TEXT | | イベント種別（例: 説明会、セミナー、インターン、合同企業説明会 等） |
| format | event_format | NOT NULL, DEFAULT 'offline' | 開催形式（`online` / `offline` / `hybrid`） |
| location | TEXT | | 会場名・住所（オフライン/ハイブリッドの場合） |
| online_url | TEXT | | オンラインURL（オンライン/ハイブリッドの場合） |
| starts_at | TIMESTAMPTZ | NOT NULL | 開始日時 |
| ends_at | TIMESTAMPTZ | | 終了日時 |
| capacity | INT | | 定員（NULLの場合は制限なし） |
| application_deadline | TIMESTAMPTZ | | 申し込み期限 |
| target_graduation_year | INT | | 対象卒業年度 |
| is_published | BOOLEAN | DEFAULT false | 公開フラグ |
| published_at | TIMESTAMPTZ | | 公開日時 |
| deleted_at | TIMESTAMPTZ | | 論理削除日時 |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 20. event_registrations — イベント参加申し込み

学生のイベント参加申し込みを管理する。1イベント1学生1レコード。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| event_id | UUID | NOT NULL, FK → events(id) | 対象イベント |
| student_id | UUID | NOT NULL, FK → students(id) | 申し込み学生 |
| status | event_registration_status | DEFAULT 'applied' | 参加ステータス |
| applied_at | TIMESTAMPTZ | DEFAULT now() | 申し込み日時 |
| cancelled_at | TIMESTAMPTZ | | キャンセル日時 |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| | | UNIQUE(event_id, student_id) | 重複申し込み防止 |

### 21. anonymous_visits — 匿名流入経路トラッキング

マジックリンク認証時のアクセス元追跡。初回アクセス時にサーバー側で匿名セッションIDとともに保存し、認証コールバック時にユーザーIDと紐付ける。全操作は Service Role Key 経由。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| session_token | TEXT | NOT NULL, UNIQUE | 匿名セッションID（サーバー側で生成） |
| utm_source | TEXT | | UTM source パラメータ |
| utm_medium | TEXT | | UTM medium パラメータ |
| utm_campaign | TEXT | | UTM campaign パラメータ |
| utm_term | TEXT | | UTM term パラメータ |
| utm_content | TEXT | | UTM content パラメータ |
| referrer | TEXT | | HTTP Referer ヘッダーの値 |
| landing_page | TEXT | | 最初にアクセスしたページのパス |
| user_agent | TEXT | | ブラウザのUser-Agent |
| ip_address | TEXT | | アクセス元IP |
| user_id | UUID | | 認証コールバック時に紐付けするユーザーID |
| linked_at | TIMESTAMPTZ | | ユーザーIDとの紐付け日時 |
| expires_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() + interval '30 minutes' | 有効期限 |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

※ 期限切れ未紐付けレコードは pg_cron バッチで定期削除。

---

## インデックス

### 検索パフォーマンス用

| テーブル | インデックス | 用途 |
|---|---|---|
| students | (is_profile_public) WHERE is_profile_public = true | 公開プロフィール絞り込み |
| students | (graduation_year) | 卒業年度フィルター |
| students | (university) | 大学名フィルター |
| students | (prefecture) | 都道府県フィルター |
| students | (academic_type) | 文理フィルター |
| synced_es_entries | (student_id) | 学生別ES一覧 |
| synced_es_entries | (industry) | 業界別検索 |
| synced_researches | (student_id) | 学生別調査一覧 |
| synced_interview_sessions | (student_id) | 学生別面接一覧 |
| synced_activities | (student_id) | 学生別活動一覧 |
| scouts | (student_id, status) | 学生のスカウト一覧 |
| scouts | (company_id, sent_at DESC) | 企業のスカウト履歴 |
| student_product_links | (external_user_id, product) | 外部ID逆引き |
| companies | (is_verified) WHERE is_verified = true | 審査済み企業の絞り込み |
| scouts | (job_posting_id) | 求人別スカウト一覧 |
| job_postings | (company_id) | 企業別求人一覧 |
| job_postings | (is_published) WHERE is_published = true | 公開求人絞り込み |
| job_postings | (target_graduation_year) | 卒業年度フィルター |
| chat_messages | (scout_id, created_at ASC) | スレッド内時系列取得 |
| chat_messages | (scout_id, read_at) WHERE read_at IS NULL | 未読メッセージ取得 |
| notifications | (user_id, created_at DESC) | ユーザー別通知一覧 |
| notifications | (user_id, is_read) WHERE is_read = false | 未読通知取得 |
| events | (company_id) | 企業別イベント一覧 |
| events | (is_published) WHERE is_published = true | 公開イベント絞り込み |
| events | (starts_at) | 開催日時順ソート |
| events | (target_graduation_year) | 卒業年度フィルター |
| events | (organizer_type) | 主催者種別フィルター |
| event_registrations | (event_id, student_id) | ユニーク制約 + 参加者一覧 |
| event_registrations | (student_id) | 学生別参加イベント一覧 |
| anonymous_visits | (expires_at) WHERE user_id IS NULL | 期限切れ未紐付けレコードのパージ |
| anonymous_visits | (user_id) WHERE user_id IS NOT NULL | ユーザー別流入経路参照 |
| audit_logs | (actor_id) | 操作者別ログ検索 |
| audit_logs | (target_type, target_id) | 対象別ログ検索 |
| audit_logs | (created_at DESC) | 時系列ログ閲覧 |

---

## View 定義

**View（ビュー）とは:** テーブルに対する SELECT クエリに名前をつけて保存したもの。実データは持たず、参照するたびに元テーブルから最新データを取得する仮想テーブル。用途は主に2つ:

- **カラムの公開制限** — テーブルの一部カラムだけを見せたいとき（例: 企業に学生の実名・連絡先を隠す）
- **JOIN の簡略化** — 複数テーブルの結合結果をまとめておき、毎回同じ JOIN を書かずに済むようにする

RLS は行単位のアクセス制御のみ。カラム単位の制限や頻出 JOIN の簡略化には View を使う。

### public_students — 学生公開プロフィール

企業担当者が閲覧できる学生情報を制限するビュー。個人を特定できる情報（実名・連絡先・住所詳細）を除外する。

| カラム | 元テーブル | 説明 |
|---|---|---|
| id | students.id | |
| university | students.university | 大学名 |
| faculty | students.faculty | 学部 |
| department | students.department | 学科 |
| academic_type | students.academic_type | 文理区分 |
| graduation_year | students.graduation_year | 卒業年度 |
| prefecture | students.prefecture | 都道府県（市区町村以下は非公開） |
| profile_image_url | students.profile_image_url | プロフィール画像 |
| bio | students.bio | 自己紹介文 |

**抽出条件:** `is_profile_public = true` AND `deleted_at IS NULL`

※ 企業担当者の RLS は `students` テーブルではなくこの View に対して設定する。スカウト承諾後に実名・連絡先を開示するフローは別途検討。

### searchable_students — 学生検索用ビュー

企業担当者が学生を検索する際に使用する。`students` と `student_integrated_profiles` を JOIN し、検索・フィルタに必要な情報をまとめる。

| カラム | 元テーブル | 説明 |
|---|---|---|
| id | students.id | |
| university | students.university | 大学名 |
| faculty | students.faculty | 学部 |
| academic_type | students.academic_type | 文理区分 |
| graduation_year | students.graduation_year | 卒業年度 |
| prefecture | students.prefecture | 都道府県 |
| profile_image_url | students.profile_image_url | プロフィール画像 |
| bio | students.bio | 自己紹介文 |
| summary | student_integrated_profiles.summary | AIによる人物要約 |
| strengths | student_integrated_profiles.strengths | 強み・特性 |
| interests | student_integrated_profiles.interests | 志望業界・企業群 |
| skills | student_integrated_profiles.skills | スキル評価 |
| preferred_work_locations | student_integrated_profiles.preferred_work_locations | 志望勤務先 |
| activity_level | student_integrated_profiles.activity_level | 就活活動量 |

**抽出条件:** `is_profile_public = true` AND `deleted_at IS NULL`

**JOIN:** `students LEFT JOIN student_integrated_profiles ON students.id = student_integrated_profiles.student_id`（プロフィール未生成の学生も検索対象に含める）

---

## RLSポリシー方針

**RLS（Row Level Security）とは:** PostgreSQL の機能で、テーブルの各行に対して「誰が読み書きできるか」をポリシーとして定義する仕組み。Supabase ではクライアントからの全リクエストに RLS が適用されるため、アプリ層のバグがあってもDB層で不正アクセスをブロックできる。ただし制御は行単位のみで、カラム単位の制限はできない（→ View で補う）。

### 学生（student ロール）

| テーブル | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| students | 自分のレコードのみ | 自分のIDで作成 | 自分のレコードのみ | — |
| synced_* | 自分のレコードのみ | — (ETLのみ) | — | — |
| student_integrated_profiles | 自分のレコードのみ | — (APIのみ) | — | — |
| scouts | 自分宛のみ | — | status, read_at, responded_at のみ | — |
| companies | 全企業閲覧可 | — | — | — |
| job_postings | is_published = true のみ | — | — | — |
| chat_messages | 自分が当事者のスカウトのみ | スカウト当事者 かつ status = accepted | — | — |
| notifications | 自分宛のみ | — (Service Role のみ) | is_read, read_at のみ | — |
| student_notification_settings | 自分のレコードのみ | 自分のstudent_idで作成 | 自分のレコードのみ | — |
| events | 公開イベントのみ | — | — | — |
| event_registrations | 自分の申し込みのみ | 公開イベントに申し込み | status（キャンセル）のみ | — |

### 企業担当者（company_owner / company_admin / company_member ロール）

全操作の前提条件: **所属企業の `is_verified = true`**（未審査企業は学生データへのアクセス不可）

| テーブル | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| public_students (View) | is_verified = true の企業のみ閲覧可 | — | — | — |
| searchable_students (View) | is_verified = true の企業のみ閲覧可（検索用） | — | — | — |
| synced_* | 対象学生が is_profile_public = true の場合のみ | — | — | — |
| scouts | 自社のスカウトのみ | 自社として送信（is_verified = true の場合のみ） | 自社のスカウトのみ | — |
| companies | 全企業閲覧可 | — | owner/admin のみ自社を更新 | — |
| company_members | 自社メンバーのみ | owner のみ追加 | owner のみ更新 | owner のみ削除 |
| saved_searches | 自分のもののみ | 作成可 | 自分のもののみ | 自分のもののみ |
| job_postings | 自社の全求人 | 自社メンバー（is_verified = true） | 自社の求人のみ | —（論理削除） |
| chat_messages | 自社が当事者のスカウトのみ | スカウト当事者 かつ status = accepted | read_at のみ相手側が更新可 | — |
| notifications | 自分宛のみ | — (Service Role のみ) | is_read, read_at のみ | — |
| company_notification_settings | 自分のレコードのみ | 自分のcompany_member_idで作成 | 自分のレコードのみ | — |
| events | 自社の全イベント + 公開中の運営イベント | 自社メンバー（is_verified = true） | 自社のイベントのみ | —（論理削除） |
| event_registrations | 自社イベントの申し込み一覧 | — | status（確認・出席記録）のみ | — |

### Service Role のみ（クライアントアクセス不可）

| テーブル | ポリシー | 説明 |
|---|---|---|
| anonymous_visits | 全操作 USING(false) | 流入経路トラッキング。全操作を Service Role Key 経由で実行 |
| notifications（INSERT） | クライアントからの INSERT 不可 | 通知作成はサーバーサイドのみ |

---

## データ連携フロー

### ソースプロダクトの技術基盤

| プロダクト | DB/基盤 | ETL接続方法 |
|---|---|---|
| スマートES | PlanetScale (MySQL) → BigQuery | BigQuery API 経由で取得 |
| 企業分析AI | Supabase (PostgreSQL) | DB直接接続 or Supabase API |
| 面接練習AI | Supabase (PostgreSQL) | DB直接接続 or Supabase API |
| すごい就活 | Bubble | Bubble Data API 経由で取得 |

接続方法が3種類あるため、ETLスクリプトはプロダクトごとにアダプターを分ける設計とする。

### データフロー

3つのフェーズで構成される。

#### Phase A: 学生の同意（UIアクション）

```
学生がログイン → データ連携画面で連携プロダクトを選択・承認
                                    │
                                    ▼
                     ┌──────────────────────────┐
                     │   student_product_links   │ ← メールアドレスで紐付け（学生の能動的選択）
                     └──────────────────────────┘
```

#### Phase B: ETL（定期バッチ同期）

`student_product_links` の紐付けを参照し、該当プロダクトからデータを同期する。

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  スマートES   │    │  企業分析AI   │    │  面接練習AI   │    │  すごい就活   │
│ PlanetScale  │    │  Supabase    │    │  Supabase    │    │   Bubble    │
│  → BigQuery  │    │              │    │              │    │             │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
  BigQuery API      DB直接接続/API     DB直接接続/API     Bubble Data API
       │                  │                  │                  │
       └──────────────────┴──────────────────┴──────────────────┘
                                    │
                        ETLジョブ（Service Role Key）
                                    │
                 ┌────────────────┬──┴─────────────┐
                 ▼                ▼                 ▼
          synced_es_entries  synced_researches  synced_interview_sessions
                                                  synced_activities
```

#### Phase C: AI プロフィール生成

```
          synced_es_entries  synced_researches  synced_interview_sessions
                                                  synced_activities
                 │                │                │
                 └────────────────┼────────────────┘
                                  │
                           Claude API で分析
                                  │
                                  ▼
                     ┌──────────────────────────┐
                     │ student_integrated_profiles│
                     └──────────────────────────┘
```

#### 連携手順

**連携方式: ETL（定期バッチ）** — リアルタイム性が必要になった場合にAPI連携を検討

1. 学生がスカウトサービスに初回ログイン → Supabase Auth アカウント作成（メール所有権証明済み）
2. 学生が「データ連携画面」で連携したいプロダクトを選択
3. 連携候補はメール検証済みアカウントのみ表示。データプレビューで内容を確認後、学生が承認 → `data_consent_granted_at` を記録
4. `student_product_links` に紐付けを作成 — **ここまで Phase A**
5. ETLジョブ（Service Role Key）が連携元DBからデータを抽出・変換 → `synced_*` テーブルに格納 — **Phase B**
6. Claude API が統合プロフィールを生成 → `student_integrated_profiles` に保存 — **Phase C**
7. 学生が `is_profile_public = true` にすると企業から検索可能に
