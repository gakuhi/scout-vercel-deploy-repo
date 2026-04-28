import { describe, expect, it } from "vitest";
import type { EventItem } from "../schema";
import {
  applyRemainingCapacity,
  mapDbEventToEventDetail,
  mapDbEventToEventItem,
  type DbEventRow,
} from "../lib/mappers";

const baseRow: DbEventRow = {
  id: "evt-1",
  title: "サマーインターン説明会",
  description: "説明文",
  event_type: "会社説明会",
  format: "online",
  location: null,
  online_url: "https://example.com/meet",
  starts_at: "2026-05-20T19:00:00+09:00",
  ends_at: "2026-05-20T20:30:00+09:00",
  capacity: 100,
  application_deadline: "2026-05-15T23:59:59+09:00",
  target_graduation_year: 2027,
};

describe("mapDbEventToEventItem", () => {
  it("DB 行から EventItem を生成し dateLabel を YYYY.MM.DD に整形する", () => {
    const item = mapDbEventToEventItem(baseRow);
    expect(item.id).toBe("evt-1");
    expect(item.title).toBe("サマーインターン説明会");
    expect(item.dateLabel).toBe("2026.05.20");
    expect(item.locationKind).toBe("online");
    expect(item.badge).toBe("online");
    expect(item.category).toBe("会社説明会");
    expect(item.targetGraduationYear).toBe(2027);
  });

  it("location が null かつ format=online なら『オンライン開催』", () => {
    const item = mapDbEventToEventItem({ ...baseRow, location: null });
    expect(item.locationLabel).toBe("オンライン開催");
  });

  it("location が空文字 + format=offline なら『開催情報調整中』", () => {
    const item = mapDbEventToEventItem({
      ...baseRow,
      format: "offline",
      location: "",
    });
    expect(item.locationLabel).toBe("開催情報調整中");
  });

  it("location が設定されていればそれを優先", () => {
    const item = mapDbEventToEventItem({
      ...baseRow,
      format: "offline",
      location: "東京都渋谷区",
    });
    expect(item.locationLabel).toBe("東京都渋谷区");
  });

  it("event_type が EVENT_CATEGORIES に無い値なら『その他』にフォールバック", () => {
    const item = mapDbEventToEventItem({
      ...baseRow,
      event_type: "unknown-category",
    });
    expect(item.category).toBe("その他");
  });

  it("event_type が null でも『その他』に倒れる", () => {
    const item = mapDbEventToEventItem({ ...baseRow, event_type: null });
    expect(item.category).toBe("その他");
  });

  it("application_deadline (TIMESTAMPTZ) → YYYY-MM-DD に整形", () => {
    const item = mapDbEventToEventItem(baseRow);
    expect(item.applicationDeadline).toBe("2026-05-15");
  });

  it("application_deadline が null なら null", () => {
    const item = mapDbEventToEventItem({
      ...baseRow,
      application_deadline: null,
    });
    expect(item.applicationDeadline).toBeNull();
  });

  it("imageUrl 未指定ならデフォルト画像を割り当てる", () => {
    const item = mapDbEventToEventItem(baseRow);
    // public/images の SVG に統一（外部 URL から差し替え済み）
    expect(item.imageUrl).toMatch(/^\/images\/.+\.svg$/);
  });

  it("imageUrl を渡せばそれを使う", () => {
    const item = mapDbEventToEventItem(baseRow, {
      imageUrl: "https://custom.example/x.png",
    });
    expect(item.imageUrl).toBe("https://custom.example/x.png");
  });

  it("remainingCapacity 初期値は capacity と一致（呼び出し側で上書き想定）", () => {
    const item = mapDbEventToEventItem({ ...baseRow, capacity: 50 });
    expect(item.remainingCapacity).toBe(50);
  });
});

describe("applyRemainingCapacity", () => {
  const baseItem: EventItem = {
    id: "evt-1",
    title: "x",
    dateLabel: "2026.05.20",
    locationLabel: "x",
    locationKind: "online",
    badge: "online",
    imageUrl: "x",
    category: "会社説明会",
    jobTypes: [],
    capacity: 100,
    remainingCapacity: 100,
    applicationDeadline: null,
    targetGraduationYear: null,
  };

  it("appliedCount 分を capacity から差し引く", () => {
    const counts = new Map([["evt-1", 30]]);
    const result = applyRemainingCapacity(baseItem, counts);
    expect(result.remainingCapacity).toBe(70);
  });

  it("申込件数 0 (map に無い) なら capacity と同じ", () => {
    const result = applyRemainingCapacity(baseItem, new Map());
    expect(result.remainingCapacity).toBe(100);
  });

  it("申込件数が capacity を超えても 0 で下限を切る", () => {
    const counts = new Map([["evt-1", 200]]);
    const result = applyRemainingCapacity(baseItem, counts);
    expect(result.remainingCapacity).toBe(0);
  });

  it("capacity が null なら item をそのまま返す", () => {
    const item = { ...baseItem, capacity: null, remainingCapacity: null };
    const result = applyRemainingCapacity(item, new Map([["evt-1", 5]]));
    expect(result).toBe(item);
    expect(result.remainingCapacity).toBeNull();
  });
});

describe("mapDbEventToEventDetail", () => {
  it("description が空なら段落配列も空", () => {
    const detail = mapDbEventToEventDetail({ ...baseRow, description: null });
    expect(detail.description).toEqual([]);
  });

  it("description は 2 連続改行で段落分割される", () => {
    const detail = mapDbEventToEventDetail({
      ...baseRow,
      description: "段落1\n\n段落2\n\n\n段落3",
    });
    expect(detail.description).toEqual(["段落1", "段落2", "段落3"]);
  });

  it("event_type が会社説明会なら heroEyebrow も同じ", () => {
    const detail = mapDbEventToEventDetail(baseRow);
    expect(detail.heroEyebrow).toBe("会社説明会");
  });

  it("event_type が「その他」なら heroEyebrow は『イベント』に上書き", () => {
    const detail = mapDbEventToEventDetail({
      ...baseRow,
      event_type: "その他",
    });
    expect(detail.heroEyebrow).toBe("イベント");
  });

  it("event_type が範囲外なら heroEyebrow は『イベント』", () => {
    const detail = mapDbEventToEventDetail({
      ...baseRow,
      event_type: "invalid",
    });
    expect(detail.heroEyebrow).toBe("イベント");
  });

  it("appliedCount が capacity を超えても remaining は 0 で下限", () => {
    const detail = mapDbEventToEventDetail(baseRow, { appliedCount: 200 });
    expect(detail.remainingCapacity).toBe(0);
  });

  it("capacity null なら remainingCapacity も null", () => {
    const detail = mapDbEventToEventDetail({ ...baseRow, capacity: null });
    expect(detail.remainingCapacity).toBeNull();
  });

  it("speakers / schedule / access は DB に無いので空配列 / null", () => {
    const detail = mapDbEventToEventDetail(baseRow);
    expect(detail.speakers).toEqual([]);
    expect(detail.schedule).toEqual([]);
    expect(detail.access).toBeNull();
  });

  it("format / onlineUrl / dateTimeRangeLabel / 締切 DateTimeLabel を JST で詰める", () => {
    const detail = mapDbEventToEventDetail(baseRow);
    expect(detail.format).toBe("online");
    expect(detail.onlineUrl).toBe("https://example.com/meet");
    expect(detail.dateTimeRangeLabel).toBe("2026.05.20 (水) 19:00 〜 20:30");
    expect(detail.applicationDeadlineDateTimeLabel).toBe("2026.05.15 23:59");
  });

  it("application_deadline が null なら DateTimeLabel も null", () => {
    const detail = mapDbEventToEventDetail({
      ...baseRow,
      application_deadline: null,
    });
    expect(detail.applicationDeadlineDateTimeLabel).toBeNull();
  });
});
