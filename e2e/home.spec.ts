import { test, expect } from "@playwright/test";

test("ホームページが表示される", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
});
