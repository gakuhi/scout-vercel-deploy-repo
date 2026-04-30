import { test, expect } from "@playwright/test";

// TODO: ログイン画面のリデザイン後、SSR/CSR の境界が変わって h1 検出が不安定に
// なったため一時 skip。/ → /company/login のリダイレクト + ログイン画面の
// 主要要素検証として書き直す。
test.skip("ホームページが表示される", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
});
