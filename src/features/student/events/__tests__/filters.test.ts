import { describe, expect, it } from "vitest";
import {
  matchesFilter,
  matchesJobType,
  matchesMonth,
  matchesSearch,
  matchesYear,
} from "../lib/filters";
import type { EventItem } from "../schema";

const baseEvent: EventItem = {
  id: "evt-1",
  title: "ゴールドマン・サックス サマーインターン説明会",
  dateLabel: "2026.05.20",
  locationLabel: "東京都千代田区 / オンライン (Hybrid)",
  locationKind: "online",
  badge: "online",
  imageUrl: "x",
  category: "会社説明会",
  jobTypes: [],
  capacity: 100,
  remainingCapacity: 50,
  applicationDeadline: null,
  targetGraduationYear: null,
};

const applied = (id: string) => id === "applied-1";
const notApplied = () => false;

describe("matchesFilter", () => {
  it("all は常に true", () => {
    expect(matchesFilter(baseEvent, "all", notApplied)).toBe(true);
  });

  it("applied は isApplied 判定に委譲する", () => {
    expect(
      matchesFilter({ ...baseEvent, id: "applied-1" }, "applied", applied),
    ).toBe(true);
    expect(
      matchesFilter({ ...baseEvent, id: "other" }, "applied", applied),
    ).toBe(false);
  });

  it("online フィルタは locationKind と一致するもののみ", () => {
    expect(
      matchesFilter({ ...baseEvent, locationKind: "online" }, "online", notApplied),
    ).toBe(true);
    expect(
      matchesFilter({ ...baseEvent, locationKind: "offline" }, "online", notApplied),
    ).toBe(false);
  });

  it("offline / hybrid フィルタも locationKind と突合", () => {
    expect(
      matchesFilter({ ...baseEvent, locationKind: "offline" }, "offline", notApplied),
    ).toBe(true);
    expect(
      matchesFilter({ ...baseEvent, locationKind: "hybrid" }, "hybrid", notApplied),
    ).toBe(true);
    expect(
      matchesFilter({ ...baseEvent, locationKind: "online" }, "hybrid", notApplied),
    ).toBe(false);
  });

  it("カテゴリキー（会社説明会など）は event.category と完全一致", () => {
    expect(
      matchesFilter({ ...baseEvent, category: "会社説明会" }, "会社説明会", notApplied),
    ).toBe(true);
    expect(
      matchesFilter({ ...baseEvent, category: "セミナー" }, "会社説明会", notApplied),
    ).toBe(false);
  });
});

describe("matchesYear", () => {
  it("selectedYear が null なら全件通す", () => {
    expect(
      matchesYear({ ...baseEvent, targetGraduationYear: 2027 }, null),
    ).toBe(true);
  });

  it("event.targetGraduationYear が null（全学年対象）なら常に通す", () => {
    expect(matchesYear({ ...baseEvent, targetGraduationYear: null }, 2027)).toBe(
      true,
    );
  });

  it("年度が一致すれば true", () => {
    expect(matchesYear({ ...baseEvent, targetGraduationYear: 2027 }, 2027)).toBe(
      true,
    );
  });

  it("年度が異なれば false", () => {
    expect(matchesYear({ ...baseEvent, targetGraduationYear: 2027 }, 2028)).toBe(
      false,
    );
  });
});

describe("matchesMonth", () => {
  it("selectedMonth が null なら全件通す", () => {
    expect(matchesMonth({ ...baseEvent, dateLabel: "2026.05.20" }, null)).toBe(
      true,
    );
  });

  it("単一日 dateLabel と月が一致すれば true", () => {
    expect(
      matchesMonth({ ...baseEvent, dateLabel: "2026.05.20" }, "2026-05"),
    ).toBe(true);
  });

  it("月が異なれば false", () => {
    expect(
      matchesMonth({ ...baseEvent, dateLabel: "2026.05.20" }, "2026-06"),
    ).toBe(false);
  });

  it("年が異なれば false（同月でも）", () => {
    expect(
      matchesMonth({ ...baseEvent, dateLabel: "2026.05.20" }, "2027-05"),
    ).toBe(false);
  });

  it("期間表記 'YYYY.MM.DD - MM.DD' は開始月で判定", () => {
    expect(
      matchesMonth(
        { ...baseEvent, dateLabel: "2026.08.04 - 08.15" },
        "2026-08",
      ),
    ).toBe(true);
  });

  it("期間表記でも開始月以外なら false（終了側の月では拾わない）", () => {
    expect(
      matchesMonth(
        { ...baseEvent, dateLabel: "2026.08.04 - 09.15" },
        "2026-09",
      ),
    ).toBe(false);
  });
});

describe("matchesJobType", () => {
  it("selected が null なら全件通す", () => {
    expect(matchesJobType({ ...baseEvent, jobTypes: ["エンジニア"] }, null)).toBe(
      true,
    );
  });

  it("event.jobTypes が空配列（全職種対象）なら常に通す", () => {
    expect(matchesJobType({ ...baseEvent, jobTypes: [] }, "エンジニア")).toBe(
      true,
    );
  });

  it("jobTypes に含まれていれば true", () => {
    expect(
      matchesJobType(
        { ...baseEvent, jobTypes: ["エンジニア", "デザイナー"] },
        "エンジニア",
      ),
    ).toBe(true);
    expect(
      matchesJobType(
        { ...baseEvent, jobTypes: ["エンジニア", "デザイナー"] },
        "デザイナー",
      ),
    ).toBe(true);
  });

  it("jobTypes に含まれなければ false", () => {
    expect(
      matchesJobType(
        { ...baseEvent, jobTypes: ["エンジニア", "ビジネス"] },
        "コンサル",
      ),
    ).toBe(false);
  });
});

describe("matchesSearch", () => {
  it("空文字は全件通す", () => {
    expect(matchesSearch(baseEvent, "")).toBe(true);
  });

  it("空白のみのクエリも全件通す（trim される）", () => {
    expect(matchesSearch(baseEvent, "   ")).toBe(true);
  });

  it("title の部分一致でヒット", () => {
    expect(matchesSearch(baseEvent, "ゴールドマン")).toBe(true);
    expect(matchesSearch(baseEvent, "サマー")).toBe(true);
  });

  it("locationLabel の部分一致でヒット", () => {
    expect(matchesSearch(baseEvent, "千代田")).toBe(true);
    expect(matchesSearch(baseEvent, "Hybrid")).toBe(true);
  });

  it("category の部分一致でヒット", () => {
    expect(matchesSearch(baseEvent, "会社説明会")).toBe(true);
  });

  it("どのフィールドにも含まれなければ false", () => {
    expect(matchesSearch(baseEvent, "メルカリ")).toBe(false);
  });

  it("case-insensitive で比較する", () => {
    expect(matchesSearch(baseEvent, "HYBRID")).toBe(true);
    expect(matchesSearch(baseEvent, "hybrid")).toBe(true);
  });
});
