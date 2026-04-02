# テストガイド

## ツール

| 種類 | ツール | 用途 |
|---|---|---|
| ユニットテスト | Vitest | 関数単体のテスト |
| E2Eテスト | Playwright（#57 で導入予定） | ユーザー操作フローのテスト |

## コマンド

```bash
npm run test           # テスト実行（1回）
npm run test:watch     # ファイル変更時に自動再実行
npm run test:coverage  # カバレッジレポート付きで実行
```

## テストの実行の仕組み

`npm run test` を実行すると、Vitest がプロジェクト内の `*.test.ts` ファイルを自動で検出して全て実行する。ファイルをどこに置いても、ファイル名が `.test.ts` で終わっていれば対象になる。

## ファイル配置

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

## テストの判断基準

「自分たちが書いたロジックに間違いがないか」を確認する必要があるかどうかで判断する。
- **書く** — 入力に対して期待する出力がある処理。間違えたらバグになるもの
- **書かない** — ロジックがない（値を渡すだけ）、または外部サービスやブラウザ側の責任であるもの

## テストを書くべきもの

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

## テストを書かなくていいもの

- **値を渡すだけのラッパー関数**
  - Supabase クライアント生成（環境変数を渡すだけ）
- **定数の定義**
  - ステータス一覧
  - エラーメッセージ一覧
- **React コンポーネントの表示（E2E テストの範囲）**
  - ボタンが表示されるか
  - 画面遷移するか
- **外部サービス自体の動作（外部サービス側の責任）**
  - Supabase の `select()` がデータを返すか
  - Stripe の決済が通るか

## テストの書き方

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

## CI

PR 作成時に GitHub Actions で自動実行される。テストが失敗すると PR のマージがブロックされる。
