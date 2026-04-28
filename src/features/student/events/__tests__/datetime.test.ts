import { describe, expect, it } from "vitest";
import {
  formatDateJst,
  formatDateTimeJst,
  formatDateTimeRangeJst,
} from "../lib/datetime";

describe("formatDateJst", () => {
  it("JST を維持して YYYY.MM.DD で出力する", () => {
    expect(formatDateJst("2026-05-20T19:00:00+09:00")).toBe("2026.05.20");
  });

  it("UTC 入力でも JST 換算で日付を返す（UTC 15:00 → JST 翌 0:00）", () => {
    // 2026-05-20T15:00:00Z = 2026-05-21T00:00:00+09:00 → JST 5/21
    expect(formatDateJst("2026-05-20T15:00:00Z")).toBe("2026.05.21");
  });

  it("不正な入力は元の文字列をそのまま返す", () => {
    expect(formatDateJst("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDateTimeJst", () => {
  it("JST 時刻を YYYY.MM.DD HH:MM で出力する", () => {
    expect(formatDateTimeJst("2026-05-15T23:59:00+09:00")).toBe(
      "2026.05.15 23:59",
    );
  });

  it("UTC 入力を JST 表示に換算する（UTC 23:59 → JST 翌 8:59）", () => {
    expect(formatDateTimeJst("2026-05-15T23:59:00Z")).toBe("2026.05.16 08:59");
  });
});

describe("formatDateTimeRangeJst", () => {
  it("同日の場合は終了側を時刻のみで結合する", () => {
    expect(
      formatDateTimeRangeJst(
        "2026-05-20T19:00:00+09:00",
        "2026-05-20T20:30:00+09:00",
      ),
    ).toBe("2026.05.20 (水) 19:00 〜 20:30");
  });

  it("日跨ぎの場合は終了側も日付込みで出す", () => {
    expect(
      formatDateTimeRangeJst(
        "2026-08-04T10:00:00+09:00",
        "2026-08-15T18:00:00+09:00",
      ),
    ).toBe("2026.08.04 (火) 10:00 〜 2026.08.15 (土) 18:00");
  });

  it("終了未定 (null) の場合は開始側 + ' 〜' で終わる", () => {
    expect(
      formatDateTimeRangeJst("2026-05-20T19:00:00+09:00", null),
    ).toBe("2026.05.20 (水) 19:00 〜");
  });

  it("UTC 入力でも JST のカレンダー日で同日判定する", () => {
    // start: 2026-05-20T10:00:00Z = JST 19:00 (5/20)
    // end:   2026-05-20T11:30:00Z = JST 20:30 (5/20)
    expect(
      formatDateTimeRangeJst("2026-05-20T10:00:00Z", "2026-05-20T11:30:00Z"),
    ).toBe("2026.05.20 (水) 19:00 〜 20:30");
  });
});
