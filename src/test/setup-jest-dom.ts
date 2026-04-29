import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// 日付・時刻系のフォーマッタはローカルタイム (toLocaleDateString / getFullYear 等)
// に依存している。CI は UTC、開発機は JST なので、env で固定しないと
// 「今日 / 昨日 / 同年判定」が環境差で揺れる（実際 GitHub Actions で fail した）。
// 本プロダクトは ja-JP 想定のため、テストランタイムの TZ を Asia/Tokyo に固定。
process.env.TZ = "Asia/Tokyo";

afterEach(() => {
  cleanup();
});
