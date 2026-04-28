import { describe, expect, it } from "vitest";
import { getCountdown } from "../lib/countdown";
import type { EventItem } from "../schema";

const now = new Date("2026-04-25T12:00:00+09:00");

const make = (overrides: Partial<EventItem>): EventItem => ({
  id: "x",
  title: "x",
  dateLabel: "2026.05.10",
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

describe("getCountdown", () => {
  it("開催日が過去なら null（バッジ非表示）", () => {
    const event = make({ dateLabel: "2026.04.20", applicationDeadline: null });
    expect(getCountdown(event, now)).toBeNull();
  });

  it("締切が未来なら締切ベースで残日数を返す", () => {
    const event = make({
      dateLabel: "2026.05.10",
      applicationDeadline: "2026-05-01",
    });
    const result = getCountdown(event, now);
    expect(result?.kind).toBe("deadline");
    expect(result?.days).toBe(6); // 2026-04-25 → 2026-05-01 = 6 days
    expect(result?.label).toBe("締切まで 6 日");
  });

  it("締切が当日なら『本日締切』", () => {
    const event = make({
      dateLabel: "2026.04.30",
      applicationDeadline: "2026-04-25",
    });
    const result = getCountdown(event, now);
    expect(result?.kind).toBe("deadline");
    expect(result?.days).toBe(0);
    expect(result?.label).toBe("本日締切");
  });

  it("残り 3 日以内は urgent=true", () => {
    const event = make({
      dateLabel: "2026.05.10",
      applicationDeadline: "2026-04-27",
    });
    const result = getCountdown(event, now);
    expect(result?.urgent).toBe(true);
  });

  it("残り 4 日以上は urgent=false", () => {
    const event = make({
      dateLabel: "2026.05.10",
      applicationDeadline: "2026-04-29",
    });
    const result = getCountdown(event, now);
    expect(result?.urgent).toBe(false);
  });

  it("締切なし & 開催日未来なら開催ベース", () => {
    const event = make({
      dateLabel: "2026.05.05",
      applicationDeadline: null,
    });
    const result = getCountdown(event, now);
    expect(result?.kind).toBe("event");
    expect(result?.days).toBe(10);
    expect(result?.label).toBe("開催まで 10 日");
  });

  it("開催当日は『本日開催』", () => {
    const event = make({
      dateLabel: "2026.04.25",
      applicationDeadline: null,
    });
    const result = getCountdown(event, now);
    expect(result?.kind).toBe("event");
    expect(result?.days).toBe(0);
    expect(result?.label).toBe("本日開催");
  });

  it("締切過ぎだが開催はこれから（変則）→ 開催日ベースに倒れる", () => {
    const event = make({
      dateLabel: "2026.05.10",
      applicationDeadline: "2026-04-20", // already past
    });
    const result = getCountdown(event, now);
    expect(result?.kind).toBe("event");
    expect(result?.days).toBe(15);
  });

  it("不正な dateLabel は null", () => {
    const event = make({ dateLabel: "not-a-date", applicationDeadline: null });
    expect(getCountdown(event, now)).toBeNull();
  });
});
