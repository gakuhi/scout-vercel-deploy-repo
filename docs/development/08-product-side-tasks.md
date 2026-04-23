# プロダクト側 作業依頼書

スカウトサービスとの同時登録・データ連携にあたり、各プロダクト様にご対応いただきたい作業をまとめております。

---

## 全プロダクト共通

### 1. 「スカウトと連携する」導線の設置

以下の2箇所にリンクまたはボタンの設置をお願いいたします。

| 場所 | 対象 | 表示例 |
|---|---|---|
| 新規登録フロー | 新規登録される学生 | 「スカウトサービスも利用する」チェックボックス |
| 設定画面・ダッシュボード | 既存の学生 | 「スカウトサービスと連携する」ボタン |

ボタン押下時、**HTML form を POST 送信** していただきます。`<a href>` による GET リクエストは受け付けません（PII である email を URL に載せないため）。

```html
<form method="POST" action="https://{スカウトのドメイン}/api/student/auth/line">
  <input type="hidden" name="source" value="{プロダクト識別子}">
  <input type="hidden" name="source_user_id" value="{プロダクト側のユーザーID}">
  <input type="hidden" name="email" value="{ログイン中ユーザーのメールアドレス}">
  <input type="hidden" name="callback_url" value="{連携完了後の戻り先URL}">
  <input type="hidden" name="signature" value="{HMAC-SHA256署名}">
  <button type="submit">スカウトサービスと連携する</button>
</form>
```

クリックを省略して自動遷移させたい場合は、ページ読み込み時に JavaScript で submit する実装も可:

```html
<form method="POST" action="..." id="scout-redirect"> ... </form>
<script>document.getElementById("scout-redirect").submit();</script>
```

| body パラメータ | 内容 |
|---|---|
| `source` | プロダクト識別子（下記参照） |
| `source_user_id` | プロダクト側のユーザーID |
| `email` | ログイン中ユーザーのメールアドレス。**optional** — プロダクト側で保持していない場合は省略可、または空文字で送信してください |
| `callback_url` | 連携完了後にリダイレクトバックされるURL |
| `signature` | HMAC-SHA256署名（後述） |

**`email` を渡す理由**:
スカウト側では既存学生との突合にメールアドレスを使用します。Supabase プロダクト（面接練習AI・企業分析AI）の場合、メールアドレスは `auth.users.email` に保持されていますが、Supabase の仕様上 `auth` スキーマへの外部ロール GRANT が不可能なため、DB 直読みではなくリダイレクトパラメータ経由でお渡しいただく方式にしています。プロダクト側サーバーではログイン中ユーザーのメールアドレスを既に保持しているため、form に含めるだけでお渡しいただけます。改ざん防止は `signature` で担保します。

`email` が存在しない／取得できないユーザーの場合は省略または空文字で送信してください（スカウト側では LINE プロフィールの email へフォールバックします）。

**なぜ POST なのか**:
email は個人情報（PII）で、GET クエリで送るとブラウザ履歴・サーバーアクセスログ・Referer ヘッダ等で漏洩します。body に載せることで URL に出さず、ブラウザ履歴にも残しません。

プロダクト識別子:

| プロダクト | source の値 |
|---|---|
| スマートES | `smartes` |
| 面接練習AI | `interviewai` |
| 企業分析AI | `compai` |
| すごい就活 | `sugoshu` |

### 2. HMAC-SHA256 署名の生成

リダイレクト時に改ざん防止のための署名を付与していただきます。

署名対象: `source` + `source_user_id` + `email` + `callback_url` を連結した文字列
署名アルゴリズム: HMAC-SHA256
出力形式: 16進数文字列（hex）

```javascript
// Node.js の例
const crypto = require('crypto');
// email が無い場合は空文字 '' を連結してください
const message = source + source_user_id + (email ?? '') + callback_url;
const signature = crypto.createHmac('sha256', secret)
  .update(message)
  .digest('hex');
```

※ `email` は URL に付与する前の生の文字列（URL エンコードする前の値）を署名対象にしてください。スカウト側でも同じ生の値で署名検証を行います。

※ `email` が未取得・未保持のユーザーで `email` を省略 or 空文字で送信する場合、**署名対象の `email` 部分も空文字 `''`** として連結してください（上記コード例参照）。

秘密鍵はスカウトチームよりプロダクトごとに個別に共有させていただきます。

### 3. リダイレクトバックの処理

連携完了後、`callback_url` に以下のクエリパラメータ付きでリダイレクトバックされます。

| パラメータ | 値 | 意味 |
|---|---|---|
| `status` | `success` or `error` | 処理結果 |
| `scout_registered` | `true` | 新規登録が完了した |
| `scout_linked` | `true` | 既存アカウントへの紐付けが完了した |
| `error_message` | エラー内容 | status=error の場合 |

`status` の値に応じて「連携完了」や「エラー」の画面を表示していただければと思います。

---

## プロダクト別の追加作業
### 面接練習AI（Supabase）

| 作業 | 内容 |
|---|---|
| 読み取り専用ロール作成 | Supabase SQL Editor にて以下のSQLを1回実行してください |

```sql
-- スカウト連携用の読み取り専用ロールを作成
CREATE ROLE scout_reader WITH LOGIN PASSWORD 'スカウトチームと共有するパスワード';
GRANT USAGE ON SCHEMA public TO scout_reader;

-- スカウトが同期する対象テーブルにのみ SELECT 権限を付与
GRANT SELECT ON
  user_profiles,
  interview_sessions,
  companies,
  user_company_searches
TO scout_reader;
```

※ `auth.users` への GRANT は行いません。メールアドレスは前述のリダイレクトパラメータ経由でお渡しいただくため、DB への追加権限は不要です。

**権限の付与範囲について**:
`GRANT SELECT ON ALL TABLES` + `ALTER DEFAULT PRIVILEGES` ではなく、スカウト側が実際に同期する対象テーブルに限定した明示的な GRANT にしています。プロダクト側で今後追加される新規テーブル（管理ログ・決済情報などセンシティブなものを含む可能性）が、意図せず `scout_reader` から読める状態になることを防ぐためです。追加で同期したいテーブルが発生した場合はスカウト側から都度ご相談させていただきます。

スカウトチームへ共有いただきたいもの:
- **Transaction Pooler 経由**の接続文字列
  - 例: `postgresql://scout_reader.{project-ref}:{パスワード}@aws-0-{region}.pooler.supabase.com:6543/postgres`
  - Supabase Dashboard → Settings → Database → **Connection pooling (Transaction mode)** に表示される接続文字列の、ユーザー名・パスワード部分を `scout_reader` 用に差し替えた形式です
  - 組み立てが難しい場合は region とパスワードだけ共有いただければ、スカウト側で組み立てます

**なぜ Transaction Pooler（6543）を指定しているか**:
スカウトは Vercel Serverless Functions から接続するため、Direct Connection（5432）だと関数実行ごとに接続を張って接続数が枯渇しやすくなります。Transaction Pooler 経由にすると Supavisor が接続プールを管理してくれるため、プロダクト側 DB の接続数への影響を最小化できます。

### 企業分析AI（Supabase）

面接練習AIと基本同じ手順です。GRANT 対象テーブルのみ異なります。

| 作業 | 内容 |
|---|---|
| 読み取り専用ロール作成 | Supabase SQL Editor にて以下のSQLを1回実行してください |

```sql
CREATE ROLE scout_reader WITH LOGIN PASSWORD 'スカウトチームと共有するパスワード';
GRANT USAGE ON SCHEMA public TO scout_reader;

GRANT SELECT ON
  profiles,
  researches,
  research_messages
TO scout_reader;
```

※ `auth.users` への GRANT は行いません。`profiles` に email 列がないため、メールアドレスは前述のリダイレクトパラメータ経由でお渡しいただきます。

スカウトチームへ共有いただきたいもの:
- **Transaction Pooler 経由**の接続文字列（面接練習AI と同形式）


---

## スカウトチームからお渡しするもの

| 対象 | お渡しするもの |
|---|---|
| 全プロダクト共通 | HMAC署名用の秘密鍵（プロダクトごとに異なります） |
| 全プロダクト共通 | スカウトの登録エンドポイントURL |
| 全プロダクト共通 | callback_url のホワイトリスト登録（プロダクトのドメインをお知らせください） |

## プロダクト側からご共有いただきたいもの

| プロダクト | ご共有いただきたいもの |
|---|---|
| スマートES | PlanetScale Read-only接続情報 |
| 面接練習AI | PostgreSQL Transaction Pooler 接続文字列（`scout_reader` ロール） |
| 企業分析AI | PostgreSQL Transaction Pooler 接続文字列（`scout_reader` ロール） |
| すごい就活 | Bubble Data API トークン |
| 全プロダクト共通 | callback_url として使用するURL |
