# プロダクト側 作業依頼書

スカウトサービスとの同時登録・データ連携にあたり、各プロダクトにご対応いただきたい作業をまとめております。

---

## 全プロダクト共通

### 1. 「スカウトと連携する」導線の設置

以下の2箇所にリンクまたはボタンの設置をお願いいたします。

| 場所 | 対象 | 表示例 |
|---|---|---|
| 新規登録フロー | 新規登録される学生 | 「スカウトサービスも利用する」チェックボックス（同時登録と同じところに加えていただきたいです） |
| 設定画面・ダッシュボード | 既存の学生 | 「スカウトサービスと連携する」ボタン |

ボタン押下時、**HTML form を POST 送信** していただきます。

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
| `source_user_id` | プロダクト側のユーザーID（下記参照） |
| `email` | ログイン中ユーザーのメールアドレス。※プロダクト側で保持していない場合、空文字で送信してください |
| `callback_url` | 連携完了後にリダイレクトバックされるURL |
| `signature` | HMAC-SHA256署名（後述） |

**プロダクト識別子 / ユーザーID:**

| プロダクト | source の値 | source_user_id に入れる値 |
|---|---|---|
| スマートES | `smartes` | `pre_registrations_users` や `users_generated_es` 等の `user_id` カラムの値（認証基盤のユーザーID、varchar(255)） |
| 面接練習AI | `interviewai` | `auth.users.id` (UUID) |
| 企業分析AI | `compai` | `auth.users.id` (UUID) |

### 2. HMAC-SHA256 署名の生成

リダイレクト時に改ざん防止のための署名を付与していただきます。

署名対象: `source` + `source_user_id` + `email` + `callback_url` を連結した文字列
署名アルゴリズム: HMAC-SHA256
出力形式: 16進数文字列（hex）

```javascript
// Node.js の例
const crypto = require('crypto');
// email を保持していないユーザーの場合、email 変数に空文字 '' をセットしてください
const message = source + source_user_id + email + callback_url;
const signature = crypto.createHmac('sha256', secret)
  .update(message)
  .digest('hex');
```

※ `email` は URL に付与する前の生の文字列（URL エンコードする前の値）を署名対象にしてください。スカウト側でも同じ生の値で署名検証を行います。

※ `email` を保持していないユーザーでは form に空文字 `""` を送信してください。**署名対象の `email` 部分も空文字 `""`** として連結します（scout 側も同じルールで検証します）。

**秘密鍵の受け渡し**:
staging / production ともに、プロダクト × 環境ごとに別の秘密鍵を scout チームから別途共有します（Google Doc / onetimesecret 等、本 repo には掲載しません）。

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

## スカウトチームからお渡しするもの

### エンドポイント URL

| 環境 | URL |
|---|---|
| staging | `https://scout-vercel-deploy-repo-git-staging-gakuhis-projects.vercel.app/api/student/auth/line` |
| production | 未ローンチ（scout 本番リリース時にあらためて共有します） |

実装時は staging URL に接続して疎通確認までお願いします。production URL / 秘密鍵は scout 本番リリース時に別途お送りします。

### HMAC 秘密鍵

プロダクト × 環境ごとに scout チームから個別共有します（本 repo には掲載しません）。

---

## callback_url のホワイトリストについて

**現状**: staging は `https://webhook.site` を仮登録済みなので、疎通確認はそのまま始められます。検証環境用で別の URL で設定が必要であればご連絡ください。

production は以下で設定する想定です。相違があればご連絡ください:

```
SMARTES=https://smartes.kokoshiro.jp
INTERVIEWAI=https://interview-ai.kokoshiro.jp
COMPAI=https://compai.kokoshiro.jp
```
