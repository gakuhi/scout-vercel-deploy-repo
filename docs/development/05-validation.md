# バリデーション（Zod）

## 用語解説

### バリデーションとは

ユーザーが入力したデータが正しい形式かどうかをチェックすること。例えば「メールアドレス欄に `abc` と入力された」→ メールの形式ではないのでエラーを返す、といった処理。バリデーションがないと、不正なデータがそのままデータベースに保存されてしまう。

### スキーマとは

「このデータはどういう形式であるべきか」を定義したルールのこと。例えば「email フィールドはメールアドレス形式の文字列」「password フィールドは12文字以上の文字列」のように、各フィールドの型・制約・エラーメッセージをまとめて定義する。

> **DB スキーマとの違い**: 「スキーマ」という言葉は DB の文脈でも使われる（テーブル定義・カラム型など）。ここでいうスキーマは **バリデーションスキーマ**（＝入力データの検証ルール）であり、DB スキーマとは別物。DB スキーマは Supabase 側で管理し、バリデーションスキーマは Zod でアプリ内に定義する。

### Zod とは

TypeScript 向けのバリデーションライブラリ。スキーマを定義すると、以下の2つが同時にできる:

1. **入力チェック**: `schema.parse(data)` でデータを検証し、不正なら自動でエラーを返す
2. **型の自動生成**: `z.infer<typeof schema>` でスキーマから TypeScript の型を生成できる

スキーマを1回書くだけで「バリデーション」と「型定義」の両方が手に入るため、二重管理が不要になる。

## 概要

フォーム入力や API リクエストの入力チェックには [Zod](https://zod.dev/) を使用する。

- **クライアント**: React Hook Form + Zod
- **サーバー**: Zod（Server Actions / Route Handlers の入力検証）

## スキーマの配置ルール

| スキーマの用途 | 置き場所 | 例 |
|---|---|---|
| 1つの機能でしか使わない | `src/features/[機能名]/schemas.ts` | スカウト送信フォームのスキーマ |
| 複数の機能で共通して使う | `src/shared/schemas/` | メールアドレス、パスワード、URL など認証・プロフィール・スカウトなど複数機能で使うもの |

## 共通スキーマ一覧

`src/shared/schemas/common.ts` に定義済み:

```ts
import { z } from "zod";

// メールアドレス
export const emailSchema = z.string().email("有効なメールアドレスを入力してください");

// パスワード（12文字以上 — セキュリティ要件書準拠）
export const passwordSchema = z.string().min(12, "パスワードは12文字以上で入力してください");

// URL
export const urlSchema = z.string().url("有効なURLを入力してください");
```

## スキーマの書き方

### 基本パターン

```ts
import { z } from "zod";
import { emailSchema, passwordSchema } from "@/shared/schemas/common";

// 共通スキーマを組み合わせてフォーム用スキーマを作る
export const loginFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// 型を自動生成する
export type LoginFormValues = z.infer<typeof loginFormSchema>;
```

### エラーメッセージ

バリデーションエラーのメッセージは日本語で記述する。

```ts
z.string().min(1, "名前を入力してください");
z.number().positive("正の数を入力してください");
```

## テストの要件

### テストファイルの配置

スキーマと同じ階層に `__tests__/` フォルダを作り、その中に `.test.ts` ファイルを置く。

```
src/shared/schemas/
├── common.ts
└── __tests__/
    └── common.test.ts
```

### 1フィールドあたりのテストパターン（3〜5件）

| パターン | 内容 | 例（パスワード 12文字以上） |
|---|---|---|
| 正常値 | 典型的な正しい入力 | `"abcdefghijkl"` |
| 境界OK | ギリギリ通る値 | `"123456789012"`（12文字） |
| 境界NG | ギリギリ通らない値 | `"12345678901"`（11文字） |
| 異常値 | 明らかに不正な入力 | `"short"` |
| 空値 | 空文字・未入力 | `""` |

- **境界値を最優先**で書く（バグが最も起きやすい箇所）
- 「このテストがないとバグを見逃す」かどうかで追加の要否を判断する
