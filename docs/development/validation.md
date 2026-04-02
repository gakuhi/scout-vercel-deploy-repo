# バリデーション（Zod）

## 概要

フォーム入力や API リクエストの入力チェックには [Zod](https://zod.dev/) を使用する。

- **クライアント**: React Hook Form + Zod
- **サーバー**: Zod（Server Actions / Route Handlers の入力検証）

## スキーマの配置ルール

| スキーマの用途 | 置き場所 |
|---|---|
| 1つの機能でしか使わない | `src/features/[機能名]/schemas.ts` |
| 複数の機能で共通して使う | `src/shared/schemas/` |

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
