import { describe, it, expect } from "vitest";
import { dateToIso } from "../compai";

describe("lib/sync/compai", () => {
  describe("dateToIso", () => {
    it("Date インスタンスは ISO 文字列に変換", () => {
      const d = new Date("2026-04-22T05:15:56.000Z");
      expect(dateToIso(d)).toBe("2026-04-22T05:15:56.000Z");
    });

    it("null は null のまま", () => {
      expect(dateToIso(null)).toBeNull();
    });
  });
});
