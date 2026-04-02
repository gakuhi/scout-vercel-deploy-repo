# ディレクトリ構成ガイド

## 設計方針

**Feature-based Architecture（機能単位アーキテクチャ）** を採用。

- `app/` はルーティングとレイアウトの枠に徹し、中身は `features/` から import して組み立てる
- `features/` 間の直接 import は禁止（相互依存を防ぐ）
- 汎用的なものは `components/` や `shared/` に置き、依存関係を一方向に保つ

## 構成

```
src/
├── app/                    # ルーティング定義のみ（ロジックは書かない）
│   ├── (auth)/             # ログイン・会員登録画面
│   ├── (student)/          # 学生マイページ系
│   ├── (company)/          # 企業管理画面系
│   ├── api/                # Route Handlers
│   ├── layout.tsx          # 全体共通（フォント設定等）
│   └── globals.css
│
├── components/             # アプリ全体で使う汎用コンポーネント（ロジックなし）
│   ├── ui/                 # shadcn/ui（Button, Input等）
│   └── elements/           # Loading, Error等の汎用パーツ
│
├── features/               # 機能単位でコード・ロジックを凝集
│   └── [feature名]/
│       ├── components/     # その機能専用のUIコンポーネント
│       ├── actions/        # Server Actions
│       ├── lib/            # 機能専用のヘルパー関数
│       ├── schemas.ts      # Zodバリデーションスキーマ
│       ├── types.ts        # 機能専用の型定義
│       └── index.ts        # 外部公開用のエクスポート
│
├── lib/                    # 外部サービスの接続設定
│   └── supabase/
│
├── shared/                 # プロジェクト全体で使う共有資産
│   ├── constants/          # 定数
│   ├── types/              # 共通の型定義（User型など）
│   └── utils/              # 共通関数（日付変換等）
│
├── middleware.ts            # 認証ガード・リダイレクト制御
└── next-env.d.ts
```

## 各ディレクトリの役割と使い分け

### `app/` - ルーティング

- フォルダ構造がそのままURLになる（例: `app/student/dashboard/page.tsx` → `/student/dashboard`）
- ページファイル（`page.tsx`）では `features/` からコンポーネントを import して表示するだけ
- ビジネスロジックやUIの実装はここに書かない

### `components/` - 汎用UI部品

- どの機能からでも使える、ロジックを持たないUI部品を置く
- `ui/`: shadcn/ui で追加したコンポーネント専用。ビジネスロジックを混ぜない
- `elements/`: ローディング表示、エラー表示など自作の汎用パーツ

### `features/` - 機能単位のコード

ここがこの構成の主役。機能に関わるものを全てこのフォルダ内にまとめる。

現在想定している機能:
- `features/auth/` - 認証（ログイン、会員登録、パスワードリセット）
- `features/student/` - 学生機能（プロフィール、ダッシュボード）
- `features/company/` - 企業機能（企業管理、メンバー管理）
- `features/scout/` - スカウト機能（送信、受信、一覧）

#### ルール
- **features 間の直接 import 禁止**: `features/scout/` から `features/student/` を直接 import しない
- **共通で使うものは `shared/` に逃がす**: 複数の feature で使う型や関数は `shared/` に移動する
- **サブフォルダは必要になったら作る**: 最初から全部作らなくてOK

### `lib/` - 外部サービス接続

- Supabase、Stripe など外部サービスのクライアント設定を置く
- 接続設定のみ。ビジネスロジックは `features/` に書く

### `shared/` - 全体共有資産

- `constants/`: アプリ全体で使う定数（ロール名、ステータス値など）
- `types/`: 複数の feature で共有する型定義（User型、Scout型など）
- `utils/`: React に依存しない純粋な関数（日付変換、文字列加工など）

## ファイルの置き場所の判断基準

| 迷ったら | 置き場所 |
|---|---|
| 1つの機能でしか使わない | `features/[機能名]/` の中 |
| 2つ以上の機能で使う | `shared/` |
| UIだけ（ロジックなし）で全体で使う | `components/` |
| 外部サービスの接続設定 | `lib/` |
