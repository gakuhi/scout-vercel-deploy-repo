# 開発環境セットアップガイド

スカウトサービスの開発に参加する全メンバーが、ローカル環境で開発を開始するために必要なツールと手順。

---

## 1. 必須ツール

| ツール | バージョン | 用途 | 完了条件 |
|---|---|---|---|
| **Node.js** | v20 LTS 以上 | JavaScript ランタイム | `node -v` でバージョンが表示される |
| **npm** | Node.js に同梱 | パッケージマネージャー | `npm -v` でバージョンが表示される |
| **Git** | 最新版 | ソース管理 | `git -v` でバージョンが表示される |
| **Supabase CLI** | 最新版 | ローカル DB・マイグレーション管理 | `supabase --version` でバージョンが表示される |
| **Claude Code** | 最新版 | AI アシスタント（チーム全員利用前提） | `claude -v` でバージョンが表示される |
| **Docker Desktop** | 最新版 | Supabase ローカル環境の実行 | `docker -v` でバージョンが表示される |

### インストール手順

各ツールについて、まず既にインストールされているか確認し、なければインストールする。

#### Git

```bash
# 確認
git -v
# バージョンが表示されれば OK → 次のツールへ
```

<details>
<summary>macOS: 未インストールの場合</summary>

```bash
xcode-select --install
```

macOS には Xcode Command Line Tools に Git が含まれている。

</details>

<details>
<summary>Windows: 未インストールの場合</summary>

[Git for Windows](https://gitforwindows.org/) からインストーラをダウンロードして実行する。

インストール時の設定はすべてデフォルトで OK。Git Bash が一緒にインストールされる。

</details>

#### Node.js（nvm / nvm-windows 経由を推奨）

nvm を使うことで、プロジェクトごとに Node.js のバージョンを切り替えられる。システムに直接インストールするより管理しやすい。

```bash
# 1. nvm が入っているか確認
nvm -v
# バージョンが表示されれば OK → 手順 3 へ
# "command not found" なら手順 2 へ
```

<details>
<summary>macOS: nvm のインストール（手順 2）</summary>

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.zshrc  # ターミナルを再読み込み
```

</details>

<details>
<summary>Windows: nvm-windows のインストール（手順 2）</summary>

[nvm-windows](https://github.com/coreybutler/nvm-windows/releases) から最新の `nvm-setup.exe` をダウンロードして実行する。

※ 既に Node.js をシステムに直接インストールしている場合は、先にアンインストールしてから nvm-windows を入れること。

インストール後、**PowerShell を管理者として開き直す**。

</details>

```bash
# 3. Node.js のバージョンを確認
node -v
# v20.x.x 以上が表示されれば OK → 次のツールへ
# 表示されない or v20 未満なら手順 4 へ

# 4. Node.js v20 をインストール・有効化（macOS / Windows 共通）
nvm install 20
nvm use 20
```

#### Supabase CLI

```bash
# 1. インストール済みか確認
supabase --version
# バージョンが表示されれば OK → 次のツールへ
```

<details>
<summary>macOS: 未インストールの場合</summary>

```bash
brew install supabase/tap/supabase
```

</details>

<details>
<summary>Windows: 未インストールの場合</summary>

```powershell
# Scoop 経由（Scoop 未導入なら先に https://scoop.sh/ を参照）
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

または npm 経由でもインストール可能:

```bash
npm install -g supabase
```

</details>

#### Claude Code

```bash
# 1. インストール済みか確認
claude -v
# バージョンが表示されれば OK → 次のツールへ

# 2. 未インストールの場合（macOS / Windows 共通）
npm install -g @anthropic-ai/claude-code
```

#### Docker Desktop

Supabase ローカル環境（`supabase start`）に必要。

```bash
# インストール済みか確認
docker -v
# バージョンが表示されれば OK
```

未インストールの場合は [公式サイト](https://www.docker.com/products/docker-desktop/) からダウンロードしてインストールする（macOS / Windows 共通）。

---

## 2. 推奨ツール

| ツール | 用途 | 完了条件 |
|---|---|---|
| **VS Code** | エディタ | 起動できる |

### VS Code 推奨拡張機能

| 拡張機能 | 用途 |
|---|---|
| ESLint | コード品質チェック |
| Prettier | コードフォーマット |
| Tailwind CSS IntelliSense | Tailwind の補完 |
| GitLens | Git 履歴の可視化 |

---

## 3. リポジトリのクローンと依存関係インストール

```bash
# クローン
git clone git@github.com:kokoshiro-dev/scout-product.git
cd scout-product

# 依存関係インストール
npm install

# Claude Code スキルのインストール（skills-lock.json から復元）
npx skills install

# E2E テスト用ブラウザのインストール（初回のみ）
npx playwright install --with-deps chromium
```

> `npm install` は npm パッケージ（テストライブラリ等）をインストールする。`npx playwright install` はテスト実行に必要なブラウザ本体（Chromium）を別途ダウンロードする。両方必要。

### 完了条件

- `node_modules/` が生成されている
- `npx skills install` でスキルがインストールされている
- `npm run dev` でエラーなく開発サーバーが起動する

---

## 4. Supabase ローカル環境の起動

Supabase CLI + Docker でローカルに PostgreSQL + Auth + Storage + Studio を立ち上げる。**開発時は基本こちらを使用する。**

### 4.1 前提条件

- Docker Desktop がインストール済みで、**起動している**こと
- Supabase CLI がインストール済みであること

```bash
# 両方確認
docker -v
supabase --version
```

### 4.2 初回セットアップ

プロジェクトに `supabase/config.toml` がまだない場合のみ実行する。

```bash
# config.toml が存在するか確認
ls supabase/config.toml

# "No such file" と出た場合のみ実行
supabase init
```

> `supabase init` は `supabase/config.toml` を生成する。既にある `supabase/migrations/` には影響しない。

### 4.3 ローカル Supabase の起動

```bash
supabase start
```

初回はDockerイメージのダウンロードで **数分かかる**。完了すると以下のような接続情報が表示される:

```
API URL: http://127.0.0.1:54321
anon key: eyJhbGciOi...
service_role key: eyJhbGciOi...
Studio URL: http://127.0.0.1:54323
```

> この値はセクション5の `.env.local` 設定で使うので控えておく。

### 4.4 マイグレーションの適用

`supabase/migrations/` にあるSQLファイルをローカルDBに適用する。

```bash
# 全マイグレーションを最初から順番に適用（初回はこちらが確実）
supabase db reset
```

> `supabase db reset` はローカルDBを初期化してから全マイグレーションを順番に実行する。既存データは消えるので注意。

### 4.5 動作確認

- **Supabase Studio**: http://localhost:54323 をブラウザで開く
- Table Editor でテーブル一覧が表示されればOK

### 4.6 停止・再起動

```bash
# 停止（データは保持される）
supabase stop

# データも含めて完全リセットしたい場合
supabase stop --no-backup

# 再起動
supabase start
```

### 完了条件

- `supabase start` でローカル Supabase が起動する
- Supabase Studio（http://localhost:54323）にアクセスできる
- `supabase db reset` 後、Table Editor でテーブルが作成されている

---

## 5. 環境変数の設定

`.env.local` をプロジェクトルートに作成する。**本番の値は絶対に使わないこと。**

### A. ローカル Supabase を使う場合（基本こちら）

`supabase start` の出力値をそのまま使う。

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=（supabase start で表示された anon key）
SUPABASE_SERVICE_ROLE_KEY=（supabase start で表示された service_role key）
```

### B. クラウドの開発用 Supabase を使う場合

ローカルで Docker を動かせない等の事情がある場合のみ。福田から接続情報を受け取る。

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=（福田から共有された anon key）
SUPABASE_SERVICE_ROLE_KEY=（福田から共有された service_role key）
```

### 完了条件

- `.env.local` が作成されている
- `.env.local` が `.gitignore` に含まれている（コミットされない）
- 使用する Supabase 環境（ローカル or クラウド dev）の値が設定されている

---

## 6. 開発サーバーの起動

```bash
npm run dev
```

### 完了条件

- `http://localhost:3000` でアプリが表示される
- ブラウザでページ遷移ができる
- コンソールにエラーが出ていない

---

## 7. 環境構成

| 環境 | ブランチ | URL | Supabase | 用途 |
|---|---|---|---|---|
| **Production** | `main` | Vercel 本番 URL | 本番プロジェクト | 本番環境。main にマージで自動デプロイ |
| **Staging** | `staging` | Vercel Preview URL | staging プロジェクト | 本番前の動作確認。staging にマージで自動デプロイ |
| **ローカル** | `feat/*` 等 | http://localhost:3000 | ローカル（Docker） | 各開発者の開発・確認用 |

### デプロイフロー

```
feat/xxx → PR → staging にマージ → ステージングで確認
                 ↓ 確認OK
              staging → PR → main にマージ → 本番デプロイ
```

1. `feat/xxx` ブランチで開発（ローカルで確認）
2. `staging` ブランチへ PR を出してマージ → ステージング環境に自動デプロイ
3. ステージングで動作確認
4. 確認OK → `main` ブランチへ PR を出してマージ → 本番に自動デプロイ

### 環境変数の管理

| 環境 | 管理場所 | 設定者 |
|---|---|---|
| Production | Vercel 環境変数（Production） | 福田 |
| Staging | Vercel 環境変数（Preview） | 福田 |
| ローカル | `.env.local`（各自） | 各開発者 |

- **本番・staging の Supabase Key は共有しない**（セキュリティ考慮）
- ローカルは `supabase start` で発行される Key を使う

---

## 8. Git 運用ルール

| ルール | 詳細 |
|---|---|
| main / staging への直 push | **禁止** |
| 開発フロー | feature ブランチを切る → Claude Code レビュー → PR 作成 → 福田レビュー → マージ |
| ブランチ命名 | `feat/機能名`、`fix/バグ名` |
| コミットメッセージ | 日本語 OK。変更内容が分かるように書く |

### PR の粒度

**1 Issue = 1 PR** を基本とする。

- 1つの PR に複数 Issue の変更を混ぜない
- Issue が大きい場合はサブタスクに分割し、それぞれ PR を出す
- WIP（作業途中）のまま PR を出さない。実装が完了してから PR を作成する

### コミットの粒度

コミットは**機能の論理単位**で分ける。

| 良い例 | 悪い例 |
|---|---|
| 「認証APIのエンドポイント追加」 | 「作業中」 |
| 「認証のユニットテスト追加」 | 「色々修正」 |
| 「ログイン画面のUI実装」 | 1ファイルごとに1コミット |
| 「バリデーションエラーメッセージ修正」 | PR 全体を1コミットにまとめる |

### Claude Code によるコードレビュー

PR を出す前に、Claude Code のレビュー機能でセルフチェックを行う。

#### レビュー用コマンド

| コマンド | 用途 |
|---|---|
| `/review` | コード変更をレビューし、ロジックエラー・セキュリティ・パフォーマンス等の問題を**指摘**する |
| `/simplify` | 変更したコードの品質・効率を分析し、問題を**指摘 + 自動修正**する |

#### `/review` と `/simplify` の違い

| | `/review` | `/simplify` |
|---|---|---|
| 目的 | 問題の**発見・指摘** | 問題の**発見 + 自動修正** |
| 出力 | レビューコメント（指摘のみ） | 修正済みコード + サマリー |
| チェック観点 | コードの正しさ、セキュリティ、パフォーマンス | コードの再利用性、品質、効率性 |
| 使い所 | 実装完了後の最初のセルフチェック | `/review` の指摘修正後、さらに品質を上げたいとき |

#### PR 前のレビュー手順

1. 実装が完了したら、Claude Code で `/review` を実行
2. 指摘事項を確認・修正
3. `/simplify` で自動修正できるものを修正
4. PR を作成
5. **PR テンプレートのチェックリストを自分で埋める**（セルフチェック）

> **ルール**: PR を出す前に必ず `/review` を1回以上実行すること。レビュー指摘の重大なもの（セキュリティ・ロジックエラー）は修正してから PR を出す。

#### PR テンプレートについて

PR 作成時に自動でテンプレートが表示される（`.github/pull_request_template.md`）。テンプレート内のチェックリスト（テスト確認・セキュリティチェック・Claude Code レビュー確認）は **PR 作成者がセルフチェックして埋める**。レビュアーはチェック済みの状態で PR を受け取り、内容を確認する。

---

## 9. 主要 npm スクリプト

| コマンド | 用途 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run lint` | ESLint によるコードチェック |
| `npm run test` | Vitest によるユニットテスト |
| `npm run test:e2e` | Playwright による E2E テスト |
| `npm run test:e2e:ui` | E2E テスト（UI モード・デバッグ用） |
| `npm run format` | Prettier によるコードフォーマット |

---

## 10. トラブルシューティング

| 問題 | 対処法 |
|---|---|
| `npm install` でエラー | Node.js のバージョンを確認（v20 以上か） |
| `supabase start` が失敗 | Docker Desktop が起動しているか確認 |
| 環境変数が読み込まれない | `.env.local` のファイル名が正しいか確認。サーバー再起動が必要 |
| ポート 3000 が使用中 | macOS: `lsof -i :3000` で確認し該当プロセスを停止。Windows: `netstat -ano \| findstr :3000` で PID を確認し `taskkill /PID <PID> /F` で停止 |
| Windows で `nvm use` が効かない | PowerShell を**管理者として**開き直してから実行する |
| Windows でパスが長すぎるエラー | `git config --global core.longpaths true` を実行 |

---

## セットアップ完了チェックリスト

- [ ] Node.js v20 以上がインストールされている
- [ ] Git がインストールされている
- [ ] Supabase CLI がインストールされている
- [ ] Claude Code がインストールされている
- [ ] Docker Desktop がインストールされている
- [ ] リポジトリがクローンできている
- [ ] `npm install` が成功している
- [ ] `supabase start` でローカル Supabase が起動する
- [ ] `.env.local` にローカル Supabase の接続情報が設定されている
- [ ] `npm run dev` でアプリが起動する
- [ ] VS Code の推奨拡張機能がインストールされている
