import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isFresh } from "../schema";

describe("isFresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T12:00:00+09:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("送信から 1 時間以内なら true", () => {
    expect(isFresh("2026-04-25T11:00:00+09:00")).toBe(true);
  });

  it("送信から 23 時間 59 分なら true", () => {
    expect(isFresh("2026-04-24T12:01:00+09:00")).toBe(true);
  });

  it("送信から 24 時間ちょうどなら false（境界）", () => {
    expect(isFresh("2026-04-24T12:00:00+09:00")).toBe(false);
  });

  it("送信から 24 時間以上経っていれば false", () => {
    expect(isFresh("2026-04-23T10:00:00+09:00")).toBe(false);
  });

  it("無効な日時文字列なら false", () => {
    expect(isFresh("invalid-date")).toBe(false);
  });

  it("空文字なら false", () => {
    expect(isFresh("")).toBe(false);
  });
});
