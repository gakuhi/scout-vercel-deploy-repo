# スカウトサービス セキュリティ要件定義書

ver1 | 2026年3月25日 作成

---

## 1. 認証（Authentication）

### 1.1 パスワード管理

| 項目 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| ハッシュアルゴリズム | bcrypt（コストファクター10以上） | **Supabase Auth** が自動処理。追加実装不要 | Supabase Auth がデフォルトで対応 |
| パスワード最小要件 | **12文字以上**。複雑性（英数記号混合）は強制しない。長いパスフレーズを推奨 | **Supabase ダッシュボード** > Auth > Providers > Password で最小文字数を12に設定 | OWASP Authentication Cheat Sheet 準拠 |
| パスワードの平文保存 | **禁止** | **Supabase Auth** が自動でbcryptハッシュ化。追加実装不要 | |
| 漏洩パスワードチェック | Have I Been Pwned 等の流出リストとの照合を推奨 | **Supabase ダッシュボード** > Auth > Providers > Password で「Leaked password protection」を有効化 | Supabase Auth のパスワード強度設定で対応 |
| パスワードリセット | メール経由のトークン発行（有効期限: 1時間） | **Supabase Auth** の `supabase.auth.resetPasswordForEmail()` を使用。メールテンプレートは Supabase ダッシュボード > Auth > Email Templates で編集 | |
| リセットトークン | 一度使用したら無効化 | **Supabase Auth** が自動処理。追加実装不要 | |

### 1.2 セッション管理

Supabase Auth のセッション管理は複数の設定値で制御される。それぞれの役割を正確に理解して設定する。

| 項目 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| セッション方式 | JWT（Supabase Auth） | **Supabase Auth** 標準機能。**@supabase/ssr** パッケージでCookieベースのセッション管理を実装 | |
| JWT有効期限（jwt_expiry） | 3600秒（1時間） | **Supabase ダッシュボード** > Auth > Settings > JWT Expiry を3600に設定 | 期限切れまでは署名検証のみでアクセス可能。サインアウト後も即時失効しない点に注意 |
| セッションタイムボックス（timebox） | 7日間 | **Supabase ダッシュボード** > Auth > Sessions > Time-box user sessions を7日に設定 | セッション全体の最大寿命。超過するとリフレッシュ不可になり再認証が必要 |
| 非アクティブタイムアウト（inactivity_timeout） | 24時間 | **Supabase ダッシュボード** > Auth > Sessions > Inactivity Timeout を24時間に設定 | 最後のアクティビティから一定時間操作がない場合にセッション失効 |
| ログアウト時 | リフレッシュトークンを無効化（scope: global で全デバイス対応） | **アプリ層** で `supabase.auth.signOut({ scope: 'global' })` を呼び出す | 既に発行済みのJWTはjwt_expiry満了まで有効な点に注意 |
| 同時セッション | 許可（ただし全デバイス一括サインアウト機能を提供） | **Supabase ダッシュボード** > Auth > Sessions > Single Session Per User を OFF に設定 | signOut({ scope: 'global' }) |

### 1.2.1 セッション失効が必要なイベント

以下のイベント発生時は、該当ユーザーの全セッションを失効させる。

| イベント | 処理 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| パスワード変更 | 全セッションを無効化し再認証を要求 | **アプリ層 API Route** でパスワード変更後に `supabase.auth.admin.signOut(userId, 'global')` を呼び出す（Service Role Key使用） | |
| メールアドレス変更 | 全セッションを無効化し再認証を要求 | 同上。メールアドレス変更確認後のWebhookまたはAPI Routeで処理 | |
| MFA有効化/無効化 | 全セッションを無効化し再認証を要求 | 同上。MFA設定変更後のAPI Routeで処理 | |
| 企業メンバーの権限変更 | 該当メンバーのセッションを無効化 | **アプリ層 API Route** で権限変更後に対象ユーザーのセッションを無効化 | 権限昇格/降格時にJWTクレームを更新するため |
| 退会処理 | 全セッションを即時無効化 | **アプリ層 API Route** で退会処理時に `supabase.auth.admin.deleteUser(userId)` を実行（セッションも自動無効化） | |
| 不審なアクティビティ検知 | 管理者判断で対象ユーザーのセッションを無効化 | **Supabase ダッシュボード** > Auth > Users から手動で対象ユーザーのセッションを無効化。または管理用API Routeを作成 | |

### 1.3 ブルートフォース対策

| 項目 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| ログイン試行制限 | 同一メールアドレスに対し5回失敗で15分ロック | **Supabase ダッシュボード** > Auth > Rate Limits で設定。不足する場合は **Vercel WAF** のカスタムルールで補完 | |
| レートリミット | 同一IPから1分間に10回まで | **Supabase Auth** のビルトインレートリミット + **Vercel WAF Rate Limiting**（Pro以上） | |
| ロック通知 | アカウントロック時にメール通知 | **アプリ層** でログイン失敗カウントを管理し、ロック時に **Supabase Auth のメール送信** または **Resend** 等のメールサービスで通知 | |

### 1.4 メール認証

| 項目 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| 新規登録時 | メール認証必須（認証完了まで機能制限） | **Supabase ダッシュボード** > Auth > Providers > Email で「Confirm email」を有効化。**アプリ層 middleware** で `email_confirmed_at` を確認し未認証ユーザーをリダイレクト | |
| 認証トークン有効期限 | 24時間 | **Supabase ダッシュボード** > Auth > Email > OTP Expiry を86400秒に設定 | |
| メールアドレス変更時 | 新アドレスへの再認証必須 | **Supabase Auth** の `supabase.auth.updateUser({ email })` を使用。Supabase が自動で新アドレスに確認メールを送信 | |

### 1.5 多要素認証（MFA）

Supabase Auth の MFA 機能を活用する。高権限ユーザーにはMFAを必須とする。

| 対象 | MFA要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| company_owner | **必須** | **アプリ層 middleware** でJWTの `aal` クレームを確認。`aal1` の場合はMFA設定画面へリダイレクト | 企業の全権限を持つため |
| company_admin | **必須** | 同上 | 学生データ閲覧 + メンバー管理権限を持つため |
| company_member | 推奨（任意） | **アプリ層** のアカウント設定画面でMFA設定UIを提供 | |
| student | 任意 | 同上 | 手軽さを優先（プロダクト原則） |
| Supabase ダッシュボード管理者 | **必須** | **Supabase ダッシュボード** > Account > Security でMFAを有効化（福田が手動設定） | 福田のみ。全データにアクセス可能 |
| Vercel プロジェクト管理者 | **必須** | **Vercel** > Settings > Security でMFAを有効化（福田が手動設定） | 福田のみ。デプロイ・環境変数にアクセス可能 |

| 項目 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| 方式 | TOTP（Time-based One-Time Password） | **Supabase Auth** の `supabase.auth.mfa.enroll()` / `supabase.auth.mfa.verify()` を使用 | Supabase Auth が標準対応 |
| MFA必須ロールの未設定時 | MFA設定画面へリダイレクト。設定完了まで主要機能を制限 | **Next.js middleware** でJWTの `aal` レベルとユーザーロールを照合し、MFA必須ロールかつ `aal1` の場合はMFA設定ページへリダイレクト | |
| リカバリーコード | MFA設定時に発行。安全な場所に保管するよう案内 | **Supabase Auth** の MFA enroll レスポンスに含まれるリカバリーコードをUIに表示 | |

---

## 2. 認可（Authorization）

### 2.1 ロール定義

| ロール | 対象 | 権限概要 | 実装方法 |
| :---- | :---- | :---- | :---- |
| student | 学生 | 自分のプロフィール・スカウトの閲覧/操作 | **Supabase** の `auth.users` メタデータ（`raw_app_meta_data.role`）に格納。**RLS ポリシー** + **アプリ層 middleware** で制御 |
| company_owner | 企業オーナー | 企業の全機能 + メンバー管理 + プラン管理 | 同上。`company_members` テーブルの `role` カラムで企業内ロールを管理 |
| company_admin | 企業管理者 | 企業の全機能（メンバー管理・プラン管理除く） | 同上 |
| company_member | 企業担当者 | 学生閲覧・スカウト送信のみ | 同上 |

### 2.2 企業アカウント審査フロー

学生のキャリア情報（ES・面接データ等）を閲覧できる立場のため、なりすまし防止が必須。

| 項目 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| 企業登録直後の状態 | is_verified = **false** | **Supabase** `companies` テーブルの `is_verified` カラム（デフォルト: false） | 審査完了まで機能制限 |
| 審査完了前にできること | 企業プロフィールの編集、プラン確認のみ | **RLS ポリシー** で `is_verified = true` を条件に学生データへのアクセスを制限 + **Next.js middleware** で未審査企業のページアクセスをブロック | |
| 審査完了前にできないこと | **学生プロフィール閲覧、スカウト送信、AIマッチング結果の閲覧** | 上記 RLS + middleware の二重制御で実現 | RLS + アプリ層で二重制御 |
| 審査方法 | 運営（福田）が企業情報を確認し、手動で is_verified = true に更新 | **Supabase ダッシュボード** の Table Editor、または管理用 API Route で更新 | MVP段階。将来的には法人番号照合等の自動化を検討 |
| 審査基準 | 企業名・所在地・担当者情報が実在するか確認 | 福田が手動でコーポレートサイト等を確認 | コーポレートサイトURL等で確認 |
| 審査完了通知 | メールで企業担当者に通知 | **Supabase Edge Function** または **API Route** から **Resend** 等のメールサービスで送信 | |

### 2.3 RLS（Row Level Security）ポリシー

全ポリシーは **Supabase SQL Editor** または **マイグレーションファイル**（`supabase/migrations/`）で `CREATE POLICY` 文として定義する。

| テーブル | SELECT | INSERT | UPDATE | DELETE |
| :---- | :---- | :---- | :---- | :---- |
| students | 本人 / 公開プロフィールは企業 | 本人 | 本人 | 本人 |
| student_integrated_profiles | 本人 / privacy_settingsに基づき企業 | システムのみ | システムのみ | システムのみ |
| privacy_settings | 本人 | 本人 | 本人 | 不可 |
| companies | 所属メンバー | システムのみ | owner/admin | 不可 |
| company_members | 所属メンバー | owner | owner | owner |
| scouts | 送信企業 / 受信学生 | 企業メンバー | 送信企業（ステータス） / 受信学生（既読・承諾/辞退） | 不可 |
| synced_* テーブル | 本人 / privacy_settingsに基づき企業 | システムのみ | システムのみ | システムのみ |
| company_plans | 所属メンバー（参照のみ） | システムのみ | システムのみ | 不可 |

### 2.3.1 View / Function の保護

RLSはテーブルだけでなく、public スキーマに公開される全オブジェクトに対して保護が必要。

| 対象 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| View | security_invoker = true を設定し、呼び出し元ユーザーの権限でRLSを評価させる | **マイグレーションファイル** で `CREATE VIEW ... WITH (security_invoker = true)` を指定 | デフォルトはview作成者の権限で実行されるため危険 |
| Function | SECURITY DEFINER は原則使用しない。使用する場合は内部で必ずauth.uid()チェックを行う | **マイグレーションファイル** で `CREATE FUNCTION ... SECURITY INVOKER` を指定。やむを得ず DEFINER を使う場合は関数冒頭で `auth.uid()` を検証 | Service Role相当の権限で実行されるリスク |
| Exposed Schema | Supabase API に公開するスキーマ（public）には不要なオブジェクトを置かない | 管理用オブジェクトは **`internal` スキーマ**を作成して配置。**Supabase ダッシュボード** > Settings > API > Exposed schemas で `public` のみ公開 | 管理用viewやfunctionは別スキーマ（internal等）に配置 |
| RPC呼び出し | supabase.rpc() で呼び出せるfunctionは、引数のバリデーション + 権限チェックを関数内で実装 | **PostgreSQL関数**内で `auth.uid()` による権限チェック + パラメータのバリデーションを記述 | |

### 2.4 APIエンドポイント認可

| 原則 | 詳細 | 実装方法 |
| :---- | :---- | :---- |
| 全エンドポイントに認証必須 | 公開エンドポイント（LP等）を除き、JWTトークン検証を必須とする | **Next.js middleware** でJWT検証を一括処理。`@supabase/ssr` の `createServerClient` でセッション取得し、未認証はリダイレクト |
| リソース所有者チェック | APIレベルでもリクエスト元のユーザーがリソースにアクセスできるか検証する（RLSだけに依存しない） | **Next.js API Route** 内でリクエスト元ユーザーIDとリソース所有者IDを照合するヘルパー関数を作成 |
| サーバーサイドのみの操作 | AI統合プロフィール生成、データ同期などはService Roleキーを使用し、クライアントからは実行不可 | **Next.js API Route**（Server Side）で `createClient` に Service Role Key を使用。`SUPABASE_SERVICE_ROLE_KEY` は `NEXT_PUBLIC_` を付けない |

---

## 3. データ保護

### 3.1 通信の暗号化

| 項目 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| HTTPS | 全通信をTLS 1.2以上で暗号化 | **Vercel** がデフォルトでSSL証明書を自動発行・更新。追加実装不要 | Vercelがデフォルトで対応 |
| HSTS | Strict-Transport-Security ヘッダーを設定 | **next.config.js** の `headers()` で設定（セクション9参照） | |
| Supabase接続 | SSL接続必須 | **Supabase** がデフォルトでSSL接続を強制。追加実装不要 | |

### 3.2 機密データの管理

| データ分類 | 例 | 保護方法 | 実装方法 |
| :---- | :---- | :---- | :---- |
| シークレット | APIキー、DB接続文字列、Stripe秘密鍵 | 環境変数で管理。コードにハードコードしない | **Vercel Environment Variables** で管理。ローカルは `.env.local` |
| 個人情報 | 氏名、メールアドレス、大学名 | Supabase managed encryption at rest + RLSによるアクセス制御 | **Supabase** のディスク暗号化（自動）+ **RLS ポリシー** で行レベル制御 |
| 認証情報 | パスワード、トークン | bcryptハッシュ化。平文保存禁止 | **Supabase Auth** が自動処理。追加実装不要 |
| 行動データ | ES内容、面接練習データ | privacy_settingsに基づく公開制御 + RLS | **RLS ポリシー** で `privacy_settings` テーブルの値を参照する条件を設定 |
| ファイル（画像・PDF等） | プロフィール画像、履歴書 | Private バケットで保存。期限付き署名付きURLを発行 | **Supabase Storage** で Private バケットを作成。表示時は `supabase.storage.from('bucket').createSignedUrl()` で署名付きURLを発行（有効期限: 1時間） |

### 3.3 環境変数管理

| 原則 | 詳細 | 実装方法 |
| :---- | :---- | :---- |
| .envファイル | .gitignoreに含める。リポジトリにコミットしない | **`.gitignore`** に `.env*` を追加（プロジェクト初期設定時） |
| 本番シークレット | Vercel Environment Variables で管理。福田のみアクセス権限 | **Vercel ダッシュボード** > Settings > Environment Variables で設定。Production / Preview / Development を分離 |
| キーローテーション | APIキー・シークレットは定期的に更新（90日ごと） | 福田が手動で90日ごとに更新。**Googleカレンダー** 等でリマインド設定 |
| NEXT_PUBLIC_ 接頭辞 | 公開して良い値のみに使用。シークレットには絶対に使わない | **コードレビュー** + **CI/CD** で `NEXT_PUBLIC_` に秘密鍵が含まれていないことを確認 |

---

## 4. インジェクション対策

### 4.1 SQLインジェクション

| 項目 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| クエリ方式 | Supabaseクライアントのパラメータ化クエリを使用 | **@supabase/supabase-js** のクエリビルダー（`.from().select().eq()` 等）を使用。自動でパラメータ化される | 生SQLの直接実行は原則禁止 |
| 生SQL使用時 | プレースホルダー（$1, $2）必須。文字列結合でのクエリ構築禁止 | **Supabase Edge Function** や **マイグレーションファイル** 内でのみ `$1, $2` プレースホルダーを使用 | Edge Functionでの使用時 |
| コードレビュー | PR時にSQLインジェクションの可能性を必ずチェック | **GitHub PR レビュー**時にセクション11.1のチェックリストに従って確認 | |

### 4.2 XSS（クロスサイトスクリプティング）

| 項目 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| 出力エスケープ | Reactのデフォルトエスケープに依存（JSX内のテキスト表示） | **React / Next.js** の JSX がデフォルトでエスケープ処理。追加実装不要 | |
| dangerouslySetInnerHTML | **使用禁止**（どうしても必要な場合はDOMPurifyでサニタイズ） | **コードレビュー** で使用を検知。やむを得ない場合は **DOMPurify**（`npm install dompurify`）でサニタイズ後に使用 | |
| CSP | Content-Security-Policyヘッダーを設定 | **next.config.js** + **Next.js middleware** でnonce ベースCSPを設定（セクション9.1参照） | script-src 'self'; object-src 'none' 等 |
| ユーザー入力のサニタイズ | スカウト本文、ES内容など自由入力テキストはサニタイズ後に表示 | **サーバー側**: API Route で **Zod** によるバリデーション。**クライアント側**: Reactのデフォルトエスケープに依存 | |

### 4.3 CSRF（クロスサイトリクエストフォージェリ）

| 項目 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| SameSite Cookie | Lax以上を設定 | **@supabase/ssr** がCookieの `SameSite=Lax` をデフォルトで設定。追加実装不要 | |
| APIリクエスト | Authorizationヘッダー（Bearer JWT）で認証するためCSRFリスクは低減 | **@supabase/ssr** が自動でCookieからJWTを取得しリクエストに付与 | |
| 状態変更操作 | POST/PUT/DELETEのみ（GETで状態変更しない） | **Next.js API Route** の設計規約として徹底。**コードレビュー** で確認 | |

---

## 5. APIセキュリティ

### 5.1 レートリミット

| エンドポイント | 制限 | 実装レイヤー | 備考 |
| :---- | :---- | :---- | :---- |
| 認証系（ログイン、登録、パスワードリセット） | 1分間に10回/IP | Supabase Auth 設定 + Vercel WAF | ブルートフォース対策 |
| スカウト送信 | 月間上限（プランに基づく）+ 1分間に5回 | アプリ層（API Route内でDBクォータチェック） | スパム防止 |
| AI統合プロフィール生成 | 1時間に10回/企業（リリース後に利用状況を見て調整） | アプリ層（API Route内でカウンター管理） | Claude API コスト管理 |
| 一般API | 1分間に60回/ユーザー | Vercel WAF Rate Limiting（Pro以上）。Hobbyの場合はアプリ層のミドルウェアで実装 | |
| Supabase API（anon key経由） | Supabase側のデフォルト制限に依存 | Supabase インフラ | 追加制御が必要な場合はEdge Functionで実装 |

### 5.2 入力バリデーション

| 原則 | 詳細 | 実装方法 |
| :---- | :---- | :---- |
| サーバーサイド必須 | クライアント側バリデーションはUX用。サーバー側で必ず再検証 | **Next.js API Route** で **Zod** スキーマによるバリデーション。クライアント側は **React Hook Form** + **Zod** でUX用バリデーション |
| 型チェック | 文字列、数値、メール形式等を厳密にチェック | **Zod** の `z.string()`, `z.number()`, `z.string().email()` 等で定義 |
| 長さ制限 | 各フィールドに最大長を設定（例: スカウト本文 5,000文字） | **Zod** の `z.string().max(5000)` 等で定義 |
| ファイルアップロード | 許可する拡張子・MIMEタイプ・サイズを制限（プロフィール画像: jpg/png、5MB以下） | **Next.js API Route** でMIMEタイプ・サイズを検証後、**Supabase Storage** にアップロード |

### 5.3 CORS設定

| 項目 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| 許可オリジン | 本番ドメインのみ明示的に指定 | **Next.js API Route** のレスポンスヘッダーで `Access-Control-Allow-Origin` を本番ドメインに設定。**Supabase ダッシュボード** > Settings > API > Additional allowed origins にも本番ドメインを追加 | ワイルドカード（*）禁止 |
| 許可メソッド | GET, POST, PUT, DELETE のみ | **Next.js API Route** で `Access-Control-Allow-Methods` を設定 | |
| 資格情報 | credentials: true の場合、オリジンを明示指定 | 同上で `Access-Control-Allow-Credentials: true` と明示オリジンをセットで設定 | |

---

## 6. ログ・監視

### 6.1 ログ記録対象

| イベント | 記録する情報 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| ログイン成功/失敗 | ユーザーID、IP、タイムスタンプ、User-Agent | **Supabase Auth** のログ（Supabase ダッシュボード > Logs > Auth）で自動記録。追加でアプリ層から **Vercel Log Drain** に送信 | |
| パスワードリセット | ユーザーID、タイムスタンプ | **Supabase Auth** ログで自動記録 | |
| スカウト送信 | 企業ID、学生ID、タイムスタンプ | **Next.js API Route** 内で `console.log` 構造化ログを出力 → **Vercel Logs** で確認。または **Supabase** の `audit_logs` テーブルに INSERT | |
| 権限変更 | 操作者、対象、変更内容 | **Next.js API Route** 内で権限変更時に `audit_logs` テーブルに記録 | |
| データ連携同意 | 学生ID、同意日時 | **Supabase** `students` テーブルの `data_consent_granted_at` カラムに記録 | 法的根拠として保存 |
| プライバシー設定変更 | 学生ID、変更前後の設定、タイムスタンプ | **Supabase Database Webhook** または **API Route** 内で `audit_logs` テーブルに変更前後の値を記録 | |

### 6.2 ログに含めてはいけない情報

| 禁止項目 | 理由 |
| :---- | :---- |
| パスワード（平文・ハッシュ） | 認証情報の漏洩リスク |
| APIキー・トークン | シークレットの漏洩リスク |
| クレジットカード情報 | PCI DSS違反 |
| ESの全文、面接回答の全文 | 個人情報の最小化原則 |

### 6.3 監視・アラート

| 監視項目 | アラート条件 | 実装方法 | 通知先 |
| :---- | :---- | :---- | :---- |
| ログイン失敗の急増 | 同一IPから10分間に20回以上 | **Supabase ダッシュボード** > Logs でAuth ログを監視。将来的には **Vercel Log Drain** + 外部監視サービス連携 | 福田 |
| スカウト送信の異常 | 1時間に上限の50%以上を消費 | **アプリ層** でスカウト送信API内にカウンターチェックを実装。閾値超過時に **Slack Webhook** または **メール** で通知 | 福田 |
| APIエラー率 | 5xxエラーが5%を超過 | **Vercel ダッシュボード** > Analytics でエラー率を監視。**Vercel Integration** で Slack 通知を設定 | 福田 |
| DB接続エラー | 発生時即時 | **Supabase ダッシュボード** > Reports でDB健全性を監視。**Supabase** のアラート機能（メール通知）を有効化 | 福田 |

---

## 7. 個人情報保護

### 7.1 同意管理

| 項目 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| 初回同意 | データ連携同意フローを経ないとプロフィールは非公開 | **アプリ層** で同意画面を表示。同意時に **Supabase** `students.data_consent_granted_at` に日時を記録。未同意の場合は `is_profile_public = false` を維持 | data_consent_granted_at で記録 |
| 同意の撤回 | いつでもプロフィール公開をOFFにできる | **アプリ層** の設定画面で `is_profile_public` トグルを提供。**Supabase** で即時更新 | is_profile_public = false |
| 利用目的の明示 | 「企業によるスカウト送信のために使用」を明記 | **利用規約ページ** および **同意画面UI** に明記。法務確認を経て文言を確定 | 利用規約・同意画面 |
| 第三者提供の明示 | 企業に公開される情報の範囲を同意画面で明記 | **同意画面UI** で公開される項目一覧をチェックリスト形式で表示 | |

### 7.2 データの公開範囲制御

全設定は **Supabase** `privacy_settings` テーブルで管理。**アプリ層**のプライバシー設定画面でトグルUIを提供。**RLS ポリシー** が各設定値を参照して企業への表示を制御。

| 項目 | デフォルト | 変更可否 | 備考 |
| :---- | :---- | :---- | :---- |
| is_profile_public | **false** | 学生が変更可 | 企業に表示される最終スイッチ |
| 実名 | 非公開 | 学生が変更可 | privacy_settings.show_real_name |
| 大学名 | 非公開 | 学生が変更可 | privacy_settings.show_university |
| ES内容 | 非公開 | 学生が変更可 | privacy_settings.show_es_data |
| 面接練習データ | 非公開 | 学生が変更可 | privacy_settings.show_interview_data |
| 企業分析データ | 非公開 | 学生が変更可 | privacy_settings.show_analysis_data |
| AI統合プロフィール | 公開（同意後） | — | is_profile_public がONなら表示 |

### 7.3 データ削除・退会

| 項目 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| 退会機能 | 学生・企業ともに退会機能を提供 | **アプリ層** の設定画面に退会ボタンを設置。確認ダイアログ → **API Route** で処理 | |
| 退会時のデータ処理 | 個人情報を削除（論理削除 → 30日後に物理削除） | **API Route** で `deleted_at` を設定（論理削除）。**Supabase Database Function** + **pg_cron** で30日経過後に物理削除 + `supabase.auth.admin.deleteUser()` を実行 | |
| スカウト履歴 | 退会後は匿名化して保持（企業側の記録として） | 物理削除時にスカウトテーブルの学生関連カラムをNULLまたは「退会済みユーザー」に置換 | |

### 7.4 個人情報保護法対応チェックリスト

- [ ] 利用目的の特定・公表（プライバシーポリシー） → **プライバシーポリシーページ** を作成し公開
- [ ] 本人同意の取得（データ連携同意フロー） → **アプリ層** の同意画面で取得・記録
- [ ] 第三者提供に関する同意取得 → **同意画面** で企業への情報提供について明示・同意取得
- [ ] 安全管理措置の実施（暗号化、アクセス制御） → 本要件書の各セクションで対応
- [ ] 開示・訂正・削除請求への対応手順 → **問い合わせフォーム** + 福田が手動対応。将来的にはデータエクスポート機能で自動化
- [ ] 個人情報取扱事業者としての届出（必要に応じて） → 福田が法務確認の上、必要に応じて届出

---

## 8. インフラ・依存関係

### 8.1 依存パッケージ管理

| 項目 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| npm audit | CI/CDパイプラインで毎回実行 | **GitHub Actions** のワークフローに `npm audit --audit-level=high` を追加 | high/critical は即対応 |
| dependabot | GitHub Dependabot を有効化 | **GitHub** リポジトリの `.github/dependabot.yml` を作成し、npm の自動更新を設定 | 自動PRで脆弱性を検知 |
| lockfile | package-lock.json をコミットに含める | **`.gitignore`** に package-lock.json を含めない（デフォルトでコミット対象） | 依存関係の固定 |

### 8.2 本番環境設定

| 項目 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| デバッグモード | **OFF** | **Vercel** が本番デプロイ時に自動で `NODE_ENV=production` を設定。追加実装不要 | NODE_ENV=production |
| エラー表示 | ユーザーにはスタックトレースを見せない。汎用エラーメッセージを表示 | **Next.js** のカスタムエラーページ（`app/error.tsx`, `app/not-found.tsx`）で汎用メッセージを表示。API Routeでは `try-catch` で詳細をログに出力し、クライアントには汎用エラーを返す | |
| ソースマップ | 本番では非公開 | **next.config.js** で `productionBrowserSourceMaps: false`（デフォルト） | |
| 不要なヘッダー | X-Powered-By を削除 | **next.config.js** で `poweredByHeader: false` を設定 | |

### 8.3 Supabase セキュリティ設定

| 項目 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| ダッシュボードアクセス | 福田のみ（MFA有効化） | **Supabase ダッシュボード** > Organization > Members で福田のみ招待。MFAを有効化 | |
| Service Role Key | サーバーサイドのみで使用。クライアントに露出させない | **Vercel Environment Variables** に `SUPABASE_SERVICE_ROLE_KEY`（`NEXT_PUBLIC_` なし）として保存。**Next.js API Route** のみで使用 | |
| anon Key | RLSが有効なテーブルに対してのみ使用 | **Vercel Environment Variables** に `NEXT_PUBLIC_SUPABASE_ANON_KEY` として保存。クライアント側 Supabase クライアントで使用 | |
| RLS | 全テーブルで有効化（例外なし） | **マイグレーションファイル** で `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` を全テーブルに適用。新テーブル作成時は必ずRLS有効化をセットで行う | |
| DB直接接続 | 本番DBへの直接接続は福田のみ | **Supabase ダッシュボード** > Settings > Database から接続情報を取得。福田のみが接続情報を保持 | |

### 8.4 Vercel セキュリティ設定

| 項目 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| チームアクセス | 必要メンバーのみ招待 | **Vercel ダッシュボード** > Team > Members で管理 | |
| Environment Variables | Production / Preview / Development を分離 | **Vercel ダッシュボード** > Settings > Environment Variables で環境ごとに異なる値を設定 | |
| Preview デプロイ保護 | Vercel Authentication（チームメンバーのみアクセス可）を有効化 | **Vercel ダッシュボード** > Settings > Deployment Protection > Vercel Authentication を ON | 全プランで利用可能 |
| 本番デプロイ保護 | Proプラン以上で Deployment Protection を有効化。Hobbyプランの場合はアプリ側認証で対応 | **Vercel ダッシュボード** > Settings > Deployment Protection で設定 | Password Protection は Pro 以上の有料機能。Vercel Authentication とは別機能 |
| Vercel Firewall | WAF Rate Limiting の活用を検討（Pro以上） | **Vercel ダッシュボード** > Firewall でルールを設定 | DDoS対策の追加レイヤー |

---

## 9. セキュリティヘッダー

next.config.js で以下のヘッダーを設定する。

全ヘッダーは **next.config.js** の `headers()` 関数内で設定する。CSPのnonce部分のみ **Next.js middleware**（`middleware.ts`）で動的に生成する。

| ヘッダー | 値 | 目的 |
| :---- | :---- | :---- |
| Content-Security-Policy | 下記 CSP 詳細を参照 | XSS対策（主防御） |
| X-Content-Type-Options | nosniff | MIMEスニッフィング防止 |
| X-Frame-Options | DENY | クリックジャッキング防止（レガシーブラウザ用。CSP frame-ancestors と併用） |
| Referrer-Policy | strict-origin-when-cross-origin | リファラー情報の制限 |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | 不要なブラウザ機能の無効化 |
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload | HTTPS強制 |

※ X-XSS-Protection は設定しない（CSPが主防御。旧ブラウザのXSSフィルターは誤検知リスクがあるため）

### 9.1 CSP（Content Security Policy）詳細

Next.js で Strict CSP を実現するために **nonce ベース**の構成を採用する。

```
default-src 'self';
script-src 'self' 'nonce-{random}';
style-src 'self' 'nonce-{random}';
img-src 'self' data: https:;
connect-src 'self' https://*.supabase.co;
font-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
```

| 項目 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| nonce生成 | リクエストごとにランダムなnonceを生成し、script/styleタグに付与 | **middleware.ts** で `crypto.randomUUID()` でnonce生成 → `x-nonce` ヘッダーに設定 → CSPヘッダーに埋め込み | Next.js middleware で実装 |
| 'unsafe-inline' | **使用しない**（nonceで代替） | CSPにnonceを含めることで `'unsafe-inline'` が不要になる | |
| 'unsafe-eval' | **使用しない** | CSPから除外するだけで対応完了 | |
| frame-ancestors 'none' | 他サイトへのiframe埋め込みを禁止（X-Frame-Optionsと同等 + CSPベース） | CSPの `frame-ancestors 'none'` で設定 | |
| レポート | Content-Security-Policy-Report-Only で段階的に導入し、違反レポートを収集後に本適用 | まず **Report-Only モード** でデプロイし、**Vercel Logs** で違反レポートを確認。問題なければ本適用に切り替え | |

---

## 10. バックアップ・復旧

### 10.1 データベースバックアップ

| 項目 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| 日次バックアップ | Supabase の自動バックアップを有効化 | **Supabase ダッシュボード** > Settings > Database > Backups で有効化（Proプランで自動有効） | Proプラン: 日次、保持期間7日間 |
| PITR（Point in Time Recovery） | Proプラン以上で有効化を推奨。任意の時点へのロールバックが可能 | **Supabase ダッシュボード** > Settings > Database > Point in Time Recovery で有効化 | 誤操作・障害発生時の復旧手段 |
| バックアップからのデータ削除 | 退会ユーザーの物理削除後、バックアップ保持期間（最大7日間）経過で自動消去 | **Supabase** のバックアップローテーションで自動対応。追加実装不要 | バックアップ保持期間を超えた個別データ削除は不可 |

### 10.2 復旧要件

| 項目 | 目標値 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| RTO（Recovery Time Objective） | 4時間以内 | **Supabase ダッシュボード** からバックアップ復元を実行。手順書に従い福田が対応 | サービス停止からの復旧目標時間 |
| RPO（Recovery Point Objective） | 24時間以内（PITR有効時は数分） | PITR有効時は **Supabase ダッシュボード** から任意の時点を指定してロールバック | 最大許容データ損失量 |
| 復旧手順書 | 福田が作成・管理。復旧テストを半年に1回実施 | **Google Docs** または **Notion** で手順書を作成・管理 | |
| 障害時の連絡フロー | 福田に即時通知 → チーム共有 → ステータスページ更新（将来） | **Supabase** のアラート通知（メール）+ **Vercel** の Slack Integration で即時通知 | |

### 10.3 開発環境のデータ分離

| 項目 | 要件 | 実装方法 | 備考 |
| :---- | :---- | :---- | :---- |
| 本番DB接続 | ローカル開発環境から本番DBへの接続を**禁止** | `.env.local` には開発用Supabaseプロジェクトの接続情報のみを記載。本番の接続情報は **Vercel Environment Variables**（Production）にのみ保存 | 環境変数の分離で担保 |
| テストデータ | 実在する学生の個人情報をテストデータに使用**禁止**。ダミーデータを使用 | **Supabase** の開発用プロジェクトに **seed.sql** でダミーデータを投入 | |
| Supabase プロジェクト分離 | 開発用・本番用でSupabaseプロジェクトを分離 | **Supabase ダッシュボード** で2つのプロジェクトを作成（dev / prod） | |

---

## 11. セキュリティ運用

### 11.1 コードレビュー観点

PRレビュー時に以下を必ず確認する。**GitHub** のPRテンプレート（`.github/pull_request_template.md`）にチェックリストとして組み込む。

- [ ] 生SQLの文字列結合がないか
- [ ] dangerouslySetInnerHTML の使用がないか
- [ ] NEXT_PUBLIC_ にシークレットが含まれていないか
- [ ] Service Role Key がクライアントコードに露出していないか
- [ ] ユーザー入力が適切にバリデーションされているか
- [ ] RLSポリシーが適切に設定されているか
- [ ] 新しいAPIエンドポイントに認証・認可チェックがあるか

### 11.2 定期的なセキュリティ対応

| 頻度 | 対応内容 | 実装方法 | 担当 |
| :---- | :---- | :---- | :---- |
| 毎デプロイ | npm audit（CI/CD自動実行） | **GitHub Actions** ワークフローに `npm audit` ステップを追加 | 自動 |
| 週次 | Dependabot アラート確認・対応 | **GitHub** > Security > Dependabot alerts を確認。自動作成されたPRをレビュー・マージ | 福田 |
| 月次 | Supabase/Vercel のセキュリティ設定確認 | **Supabase ダッシュボード** と **Vercel ダッシュボード** の設定を目視確認。チェックシートに記録 | 福田 |
| 90日ごと | APIキー・シークレットのローテーション | **Supabase ダッシュボード** > Settings > API でキーを再生成 → **Vercel Environment Variables** を更新 → 動作確認 | 福田 |
| 半年ごと | セキュリティ要件の見直し | 本ドキュメントを見直し、新たな脅威や技術変更に対応 | 福田 |
