# テストガイド

## ツール

| 種類 | ツール | 用途 |
|---|---|---|
| ユニットテスト | Vitest | 関数単体のテスト |
| E2Eテスト | Playwright | ユーザー操作フローのテスト |

## コマンド

```bash
npm run test           # ユニットテスト実行（1回）
npm run test:watch     # ファイル変更時に自動再実行
npm run test:coverage  # カバレッジレポート付きで実行
npm run test:e2e       # E2E テスト実行（ヘッドレス）
npm run test:e2e:ui    # E2E テスト実行（UI モード・デバッグ用）
```

## ユニットテストの実行の仕組み

`npm run test` を実行すると、Vitest がプロジェクト内の `*.test.ts` ファイルを自動で検出して全て実行する。ファイルをどこに置いても、ファイル名が `.test.ts` で終わっていれば対象になる。

## ユニットテストのファイル配置

### テストファイル

テスト対象ファイルと同じディレクトリに `__tests__/` フォルダを作り、その中に `.test.ts` ファイルを置く。

```
src/lib/supabase/
├── client.ts
├── server.ts
└── __tests__/
    └── client.test.ts
```

### テスト用ユーティリティ（`src/test/`）

テスト専用の共通コードは `src/test/` に置く。プロダクションコード（`src/lib/` 等）と分離するため。

| ファイル | 用途 |
|---|---|
| `mocks.ts` | 外部サービスのモックヘルパー（Supabase クライアントモック等） |
| `fixtures.ts`（今後追加） | テスト用の固定データ（ダミーの学生データ、企業データ等） |
| `setup.ts`（今後追加） | 全テスト共通の前処理（環境変数の初期化等） |

## ユニットテストとE2Eテストの使い分け

| 確認したいこと | どちらで書くか |
|---|---|
| 関数の入出力が正しいか | ユニットテスト（Vitest） |
| 画面が正しく表示されるか | E2E テスト（Playwright） |
| ユーザー操作フローが動くか | E2E テスト（Playwright） |

## ユニットテストの判断基準

「自分たちが書いたロジックに間違いがないか」を確認する必要があるかどうかで判断する。
- **書く** — 入力に対して期待する出力がある処理。間違えたらバグになるもの
- **書かない** — ロジックがない（値を渡すだけ）、または外部サービス側の責任であるもの

### ユニットテストを書くべきもの

- **バリデーション**
  - メールアドレスの形式チェック
  - パスワードの文字数制限
  - 必須項目の未入力チェック
- **データ変換・整形**
  - 姓と名を結合してフルネーム生成
  - 生年月日から年齢計算
  - 日付フォーマット変換
- **条件分岐のあるビジネスロジック**
  - ユーザーの権限に応じた表示切替
  - スカウト可否の判定
  - 料金計算
- **Supabase を使った処理のロジック部分**
  - DB から取得したデータの加工・フィルタリング
  - Supabase 呼び出し自体はモックし、その後の処理をテストする

### ユニットテストを書かなくていいもの

- **値を渡すだけのラッパー関数**
  - Supabase クライアント生成（環境変数を渡すだけ）
- **定数の定義**
  - ステータス一覧
  - エラーメッセージ一覧
- **外部サービス自体の動作（外部サービス側の責任）**
  - Supabase の `select()` がデータを返すか
  - Stripe の決済が通るか
- **画面の表示・操作（E2E テストで確認する）**
  - ボタンが表示されるか
  - 画面遷移するか

## ユニットテストの書き方

```ts
import { describe, it, expect } from "vitest";

describe("関数名やモジュール名", () => {
  it("期待する動作の説明", () => {
    const result = myFunction("入力");
    expect(result).toBe("期待する出力");
  });
});
```

### よく使うマッチャー

| マッチャー | 意味 |
|---|---|
| `toBe(値)` | 値が等しいか |
| `toEqual(obj)` | オブジェクトの中身が等しいか |
| `toHaveBeenCalledWith(...)` | 指定した引数で呼ばれたか |
| `toThrow()` | エラーを投げるか |

### 外部依存のモック

Supabase 等の外部パッケージを使う関数をテストする場合は、`vi.mock` で偽物に差し替える。

```ts
const mockFn = vi.fn(() => ({ data: [] }));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: mockFn,
}));
```

### Supabase クライアントモック

`src/test/mocks.ts` に共通の Supabase モックヘルパーを用意している。
Supabase からデータを取得して加工するような関数をテストする時に使う。

**使う場面:**
- DB から取得したデータを加工する関数のテスト
- エラー時の分岐をテストしたい時（`error` に値をセットする）
- `from().select().eq()` 等のクエリが正しいテーブルを指定しているか確認したい時

**使い方（例）:**

※ 以下の `getStudentNames` は説明用の架空の関数。実際は自分がテストしたい関数を import して使う。

```ts
// テスト対象の関数を import（実際のパスに置き換える）
import { getStudentNames } from "@/features/students/getStudentNames";
// モックヘルパーを import
import { createMockSupabaseClient } from "@/test/mocks";

it("学生一覧を取得してフルネームに変換する", async () => {
  const { supabase, mockReturn } = createMockSupabaseClient();

  // Supabase が返す偽データを設定
  mockReturn({
    data: [{ last_name: "田中", first_name: "太郎" }],
    error: null,
  });

  // テスト対象の関数に偽の Supabase クライアントを渡す
  const result = await getStudentNames(supabase);

  expect(result).toEqual(["田中 太郎"]);
  expect(supabase.from).toHaveBeenCalledWith("students");
});
```

## カバレッジ

`npm run test:coverage` を実行すると、コードのどの部分がテストで実行されたかを計測する。

**出力:**
- **ターミナル** — ファイルごとのカバレッジ率を表形式で表示
- **HTML レポート** — `coverage/` フォルダに生成される。ブラウザで開くと、行単位でテスト済み/未テストを色分けして確認できる

**除外対象（テスト対象外のファイル）:**
- `node_modules/`、`.next/` — 外部パッケージ・ビルド成果物
- `*.config.*` — 設定ファイル（vitest.config.ts 等）
- `src/instrumentation*`、`sentry.*` — Sentry 関連ファイル

設定は `vitest.config.ts` の `coverage` セクションで管理している。

## E2Eテストの実行の仕組み

`npm run test:e2e` を実行すると、Playwright が `e2e/` ディレクトリ内の `*.spec.ts` ファイルを自動で検出して全て実行する。実行時に Next.js サーバーが自動で起動する（`playwright.config.ts` の `webServer` 設定）。

## E2Eテストのファイル配置

プロジェクトルートの `e2e/` ディレクトリに `.spec.ts` ファイルを置く。ユニットテスト（`src/` 内の `.test.ts`）と明確に分離するため。

```
e2e/
└── home.spec.ts
```

## E2Eテストの判断基準

「ユーザーが実際にブラウザで操作するフロー」が正しく動くかどうかで判断する。
- **書く** — ユーザーの主要な操作フロー。壊れたらサービスが使えなくなるもの
- **書かない** — 個々の関数の入出力確認（ユニットテストで書く）、見た目の細かい調整

### E2Eテストを書くべきもの

- **認証フロー**
  - ログイン → ダッシュボード表示
  - 未ログイン時のリダイレクト
- **主要なユーザー操作**
  - フォーム入力 → 送信 → 完了画面
  - 一覧ページ → 詳細ページへの遷移
- **ページの表示確認**
  - 主要ページが正しく描画されるか
  - エラーページが適切に表示されるか

### E2Eテストを書かなくていいもの

- **関数単体のロジック確認（ユニットテストで書く）**
  - バリデーション関数の入出力
  - データ変換処理
- **外部サービス自体の動作**
  - Supabase や Stripe の API が正しく動くか
- **見た目の細かい調整**
  - ピクセル単位のレイアウト確認
  - アニメーションの動作

## E2Eテストの書き方

```ts
import { test, expect } from "@playwright/test";

test("ページが表示される", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
});
```

### よく使うロケーター

| ロケーター | 用途 |
|---|---|
| `page.locator("h1")` | HTML タグで要素を指定 |
| `page.locator(".class-name")` | CSS クラスで要素を指定 |
| `page.getByRole("button", { name: "送信" })` | ロール＋テキストで要素を指定（推奨） |
| `page.getByText("ログイン")` | テキスト内容で要素を指定 |
| `page.getByTestId("submit-btn")` | `data-testid` 属性で要素を指定 |

### よく使うアクション

| アクション | 意味 |
|---|---|
| `page.goto("/path")` | ページに遷移する |
| `page.click("button")` | 要素をクリックする |
| `page.fill("input", "値")` | 入力欄に値を入力する |
| `page.waitForURL("/next")` | URL が変わるまで待機する |

### よく使うアサーション

| アサーション | 意味 |
|---|---|
| `expect(locator).toBeVisible()` | 要素が表示されているか |
| `expect(locator).toHaveText("テキスト")` | 要素のテキストが一致するか |
| `expect(locator).toBeEnabled()` | 要素が操作可能か |
| `expect(page).toHaveURL("/path")` | 現在の URL が一致するか |

## E2Eテストのローカル実行

初回のみ、ブラウザのインストールが必要:

```bash
npx playwright install --with-deps chromium
```

その後は `npm run test:e2e` で実行できる。テスト実行時に Next.js 開発サーバーが自動で起動する（`playwright.config.ts` の `webServer` 設定）。

デバッグ時は `npm run test:e2e:ui` で UI モードを使うと、ステップごとの実行やスクリーンショット確認ができる。

## E2Eテストの設定

`playwright.config.ts` で管理。主な設定:
- **ブラウザ**: Chromium のみ（必要に応じて Firefox・Safari を追加可能）
- **webServer**: ローカルでは `npm run dev`、CI では `npm run start`（ビルド済みアプリ）を自動起動
- **リトライ**: CI では2回、ローカルでは0回

## CI

PR 作成時に GitHub Actions で自動実行される。テストが失敗すると PR のマージがブロックされる。

**実行されるジョブ:**
- **lint-and-build** — lint → ユニットテスト → ビルド
- **e2e** — ビルド → Playwright ブラウザインストール → E2E テスト
