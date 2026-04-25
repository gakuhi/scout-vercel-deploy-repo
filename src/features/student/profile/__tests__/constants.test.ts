import { describe, it, expect } from "vitest";
import { getGraduationYearOptions } from "@/features/student/profile/constants";

describe("getGraduationYearOptions", () => {
  it("指定した基準日の -2 年から +8 年までを返す", () => {
    const now = new Date("2026-06-15T00:00:00Z");
    const years = getGraduationYearOptions(now);
    expect(years[0]).toBe(2024);
    expect(years[years.length - 1]).toBe(2034);
  });

  it("11 件（現在年 -2 〜 +8）を返す", () => {
    const now = new Date("2026-06-15T00:00:00Z");
    expect(getGraduationYearOptions(now)).toHaveLength(11);
  });

  it("昇順にソートされている", () => {
    const years = getGraduationYearOptions(new Date("2030-01-01T00:00:00Z"));
    for (let i = 1; i < years.length; i++) {
      expect(years[i]).toBeGreaterThan(years[i - 1]);
    }
  });

  it("引数省略時は現在日時を使う", () => {
    const expected = new Date().getFullYear();
    const years = getGraduationYearOptions();
    expect(years).toContain(expected);
    expect(years[0]).toBe(expected - 2);
  });
});
