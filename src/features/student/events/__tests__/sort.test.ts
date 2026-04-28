import { describe, expect, it } from "vitest";
import { compareEvents, parseEventDate } from "../lib/sort";
import type { EventItem } from "../schema";

const make = (overrides: Partial<EventItem>): EventItem => ({
  id: "x",
  title: "x",
  dateLabel: "2026.05.20",
  locationLabel: "x",
  locationKind: "online",
  badge: "online",
  imageUrl: "x",
  category: "会社説明会",
  jobTypes: [],
  capacity: null,
  remainingCapacity: null,
  applicationDeadline: null,
  targetGraduationYear: null,
  ...overrides,
});

describe("parseEventDate", () => {
  // 内部で +09:00 (JST) として解釈しているので、getTime() ベースで比較すれば TZ 非依存。
  it("'YYYY.MM.DD' を正しく Date に変換（JST 解釈）", () => {
    const d = parseEventDate("2026.05.20");
    expect(d?.getTime()).toBe(
      new Date("2026-05-20T00:00:00+09:00").getTime(),
    );
  });

  it("期間表記 'YYYY.MM.DD - MM.DD' は先頭 10 文字（開始日）で解釈", () => {
    const d = parseEventDate("2026.08.04 - 08.15");
    expect(d?.getTime()).toBe(
      new Date("2026-08-04T00:00:00+09:00").getTime(),
    );
  });

  it("不正な文字列は null", () => {
    expect(parseEventDate("invalid")).toBeNull();
    expect(parseEventDate("")).toBeNull();
  });
});

describe("compareEvents", () => {
  const a = make({ id: "a", dateLabel: "2026.05.10", applicationDeadline: "2026-05-08" });
  const b = make({ id: "b", dateLabel: "2026.06.15", applicationDeadline: "2026-06-10" });
  const c = make({ id: "c", dateLabel: "2026.05.20", applicationDeadline: null });

  it("date_asc: 開催日が早い順（負 = a が前）", () => {
    expect(compareEvents(a, b, "date_asc")).toBeLessThan(0);
    expect(compareEvents(b, a, "date_asc")).toBeGreaterThan(0);
  });

  it("date_desc: 開催日が遅い順", () => {
    expect(compareEvents(a, b, "date_desc")).toBeGreaterThan(0);
    expect(compareEvents(b, a, "date_desc")).toBeLessThan(0);
  });

  it("deadline_asc: 締切が近い順", () => {
    expect(compareEvents(a, b, "deadline_asc")).toBeLessThan(0);
  });

  it("deadline_asc: 締切なし（null）は末尾に倒れる", () => {
    expect(compareEvents(a, c, "deadline_asc")).toBeLessThan(0);
    expect(compareEvents(c, a, "deadline_asc")).toBeGreaterThan(0);
  });

  it("deadline_asc: 両方 null なら 0（順序維持）", () => {
    const x = make({ id: "x", applicationDeadline: null });
    const y = make({ id: "y", applicationDeadline: null });
    expect(compareEvents(x, y, "deadline_asc")).toBe(0);
  });

  it("不正な dateLabel のイベントは末尾に倒れる", () => {
    const broken = make({ id: "broken", dateLabel: "not-a-date" });
    expect(compareEvents(broken, a, "date_asc")).toBeGreaterThan(0);
    expect(compareEvents(a, broken, "date_asc")).toBeLessThan(0);
  });

  it("featured フラグが立っているイベントは常に上に来る (date_asc)", () => {
    const featured = make({
      id: "featured",
      dateLabel: "2026.12.31",
      featured: true,
    });
    const normal = make({ id: "normal", dateLabel: "2026.05.10" });
    expect(compareEvents(featured, normal, "date_asc")).toBeLessThan(0);
    expect(compareEvents(normal, featured, "date_asc")).toBeGreaterThan(0);
  });

  it("featured 同士は二次ソートキーで並ぶ", () => {
    const f1 = make({ id: "f1", dateLabel: "2026.05.10", featured: true });
    const f2 = make({ id: "f2", dateLabel: "2026.06.15", featured: true });
    expect(compareEvents(f1, f2, "date_asc")).toBeLessThan(0);
  });
});
