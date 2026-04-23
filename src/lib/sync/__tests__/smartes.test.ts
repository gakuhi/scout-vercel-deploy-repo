import { describe, it, expect } from "vitest";
import { toIsoOrNull, toIntOrNull } from "../smartes";

describe("lib/sync/smartes", () => {
  describe("toIsoOrNull", () => {
    it("Date インスタンスを ISO 文字列に変換する", () => {
      const d = new Date("2026-04-22T05:00:00.000Z");
      expect(toIsoOrNull(d)).toBe("2026-04-22T05:00:00.000Z");
    });

    it("文字列の日付も ISO 文字列に変換する", () => {
      expect(toIsoOrNull("2026-04-22T05:00:00Z")).toBe(
        "2026-04-22T05:00:00.000Z",
      );
    });

    it("不正な値は null", () => {
      expect(toIsoOrNull(null)).toBeNull();
      expect(toIsoOrNull(undefined)).toBeNull();
      expect(toIsoOrNull(42)).toBeNull();
      expect(toIsoOrNull("invalid")).toBeNull();
      expect(toIsoOrNull("")).toBeNull();
    });
  });

  describe("toIntOrNull", () => {
    it("数値はそのまま返す", () => {
      expect(toIntOrNull(0)).toBe(0);
      expect(toIntOrNull(1)).toBe(1);
      expect(toIntOrNull(-3)).toBe(-3);
    });

    it("数値文字列は整数にパースする", () => {
      expect(toIntOrNull("5")).toBe(5);
      expect(toIntOrNull("42")).toBe(42);
      expect(toIntOrNull("-7")).toBe(-7);
    });

    it("小数文字列は先頭の整数部だけ取る（parseInt の挙動）", () => {
      expect(toIntOrNull("3.7")).toBe(3);
    });

    it("数値として解釈できない文字列・値は null", () => {
      expect(toIntOrNull("abc")).toBeNull();
      expect(toIntOrNull("")).toBeNull();
      expect(toIntOrNull(null)).toBeNull();
      expect(toIntOrNull(undefined)).toBeNull();
      expect(toIntOrNull({})).toBeNull();
      expect(toIntOrNull([])).toBeNull();
    });
  });
});
