import { describe, expect, it } from "vitest";
import type { ScoutStatus, ScoutListItem } from "@/features/company/app/scouts/schemas";

// groupByBatch と承諾率計算のロジックを抽出してテスト

function truncateToMinute(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

type ScoutBatch = {
  key: string;
  subject: string;
  sentAt: string | null;
  jobPostingTitle: string | null;
  scouts: ScoutListItem[];
};

function groupByBatch(scouts: ScoutListItem[]): ScoutBatch[] {
  const batches: ScoutBatch[] = [];
  let current: ScoutBatch | null = null;

  for (const scout of scouts) {
    const sentMinute = truncateToMinute(scout.sentAt);
    if (
      current &&
      truncateToMinute(current.sentAt) === sentMinute &&
      current.subject === scout.subject
    ) {
      current.scouts.push(scout);
    } else {
      current = {
        key: `${sentMinute}-${scout.subject}`,
        subject: scout.subject,
        sentAt: scout.sentAt,
        jobPostingTitle: scout.jobPostingTitle,
        scouts: [scout],
      };
      batches.push(current);
    }
  }
  return batches;
}

function makeScout(overrides: Partial<ScoutListItem> = {}): ScoutListItem {
  return {
    id: "id-1",
    subject: "テスト件名",
    message: "テスト本文",
    status: "sent",
    sentAt: "2026-04-24T10:30:00.000Z",
    readAt: null,
    respondedAt: null,
    expiresAt: null,
    studentId: "student-1",
    studentUniversity: "東京大学",
    studentFaculty: "工学部",
    studentName: "田中太郎",
    jobPostingTitle: "エンジニア職",
    ...overrides,
  };
}

describe("groupByBatch", () => {
  it("同じ sent_at + subject のスカウトを1バッチにまとめる", () => {
    const scouts = [
      makeScout({ id: "1", sentAt: "2026-04-24T10:30:15.123Z" }),
      makeScout({ id: "2", sentAt: "2026-04-24T10:30:15.456Z" }),
      makeScout({ id: "3", sentAt: "2026-04-24T10:30:15.789Z" }),
    ];
    const batches = groupByBatch(scouts);
    expect(batches).toHaveLength(1);
    expect(batches[0].scouts).toHaveLength(3);
  });

  it("異なる分のスカウトは別バッチになる", () => {
    const scouts = [
      makeScout({ id: "1", sentAt: "2026-04-24T10:30:15.000Z" }),
      makeScout({ id: "2", sentAt: "2026-04-24T10:31:15.000Z" }),
    ];
    const batches = groupByBatch(scouts);
    expect(batches).toHaveLength(2);
  });

  it("同じ分でも異なる件名は別バッチになる", () => {
    const scouts = [
      makeScout({ id: "1", subject: "件名A" }),
      makeScout({ id: "2", subject: "件名B" }),
    ];
    const batches = groupByBatch(scouts);
    expect(batches).toHaveLength(2);
  });

  it("1人に送ったスカウトは1件のバッチになる", () => {
    const scouts = [makeScout({ id: "1" })];
    const batches = groupByBatch(scouts);
    expect(batches).toHaveLength(1);
    expect(batches[0].scouts).toHaveLength(1);
  });

  it("空配列は空を返す", () => {
    expect(groupByBatch([])).toEqual([]);
  });

  it("ミリ秒のずれがあっても同じ分なら同じバッチ", () => {
    const scouts = [
      makeScout({ id: "1", sentAt: "2026-04-24T10:30:00.000Z" }),
      makeScout({ id: "2", sentAt: "2026-04-24T10:30:59.999Z" }),
    ];
    const batches = groupByBatch(scouts);
    expect(batches).toHaveLength(1);
  });
});

describe("承諾率計算", () => {
  function calcAcceptRate(scouts: ScoutListItem[]): number {
    const statusCounts: Record<ScoutStatus, number> = {
      sent: 0, read: 0, accepted: 0, declined: 0, expired: 0,
    };
    for (const s of scouts) statusCounts[s.status]++;
    const responded = statusCounts.accepted + statusCounts.declined;
    return responded > 0
      ? Math.round((statusCounts.accepted / responded) * 100)
      : 0;
  }

  it("承諾2 + 辞退2 → 承諾率50%", () => {
    const scouts = [
      makeScout({ status: "accepted" }),
      makeScout({ status: "accepted" }),
      makeScout({ status: "declined" }),
      makeScout({ status: "declined" }),
    ];
    expect(calcAcceptRate(scouts)).toBe(50);
  });

  it("承諾のみ → 100%", () => {
    const scouts = [
      makeScout({ status: "accepted" }),
      makeScout({ status: "accepted" }),
    ];
    expect(calcAcceptRate(scouts)).toBe(100);
  });

  it("応答なし（全て送信済み）→ 0%", () => {
    const scouts = [
      makeScout({ status: "sent" }),
      makeScout({ status: "read" }),
    ];
    expect(calcAcceptRate(scouts)).toBe(0);
  });

  it("空配列 → 0%", () => {
    expect(calcAcceptRate([])).toBe(0);
  });

  it("未読が多くても承諾率に影響しない", () => {
    const scouts = [
      makeScout({ status: "accepted" }),
      makeScout({ status: "declined" }),
      makeScout({ status: "sent" }),
      makeScout({ status: "sent" }),
      makeScout({ status: "sent" }),
      makeScout({ status: "sent" }),
    ];
    // accepted / (accepted + declined) = 1/2 = 50%
    expect(calcAcceptRate(scouts)).toBe(50);
  });
});
