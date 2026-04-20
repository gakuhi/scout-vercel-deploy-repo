import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type QueryResult = { data?: unknown; count?: number; error?: unknown };

let nextResults: Record<string, QueryResult[]> = {};
let queueIndex: Record<string, number> = {};

function makeChainable(table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  const passthroughMethods = [
    "select",
    "eq",
    "neq",
    "gte",
    "lt",
    "in",
    "is",
    "order",
    "limit",
  ];
  for (const method of passthroughMethods) {
    chain[method] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(() => Promise.resolve(getNextResult(table)));
  chain.then = (resolve: (value: QueryResult) => void) =>
    resolve(getNextResult(table));
  return chain;
}

function getNextResult(table: string): QueryResult {
  const queue = nextResults[table] ?? [];
  const idx = queueIndex[table] ?? 0;
  const result = queue[idx] ?? { data: null, count: 0, error: null };
  queueIndex[table] = idx + 1;
  return result;
}

const fromMock = vi.fn((table: string) => makeChainable(table));
const createClientMock = vi.fn(() =>
  Promise.resolve({
    from: fromMock,
  }),
);

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

beforeEach(() => {
  nextResults = {};
  queueIndex = {};
  fromMock.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

function queueResult(table: string, result: QueryResult) {
  if (!nextResults[table]) nextResults[table] = [];
  nextResults[table].push(result);
}

describe("getCompanyContext", () => {
  it("ユーザーが company_members に存在しない場合は null を返す", async () => {
    queueResult("company_members", { data: null, error: null });

    const { getCompanyContext } = await import(
      "@/features/company/app/dashboard/queries"
    );
    const result = await getCompanyContext("unknown-user-id");

    expect(result).toBeNull();
  });

  it("company_members に存在する場合は会社情報を返す", async () => {
    queueResult("company_members", {
      data: {
        id: "33333333-3333-3333-3333-333333333333",
        last_name: "鈴木",
        first_name: "一郎",
        company_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        companies: {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          name: "テスト会社",
        },
      },
      error: null,
    });

    const { getCompanyContext } = await import(
      "@/features/company/app/dashboard/queries"
    );
    const result = await getCompanyContext(
      "33333333-3333-3333-3333-333333333333",
    );

    expect(result).toEqual({
      memberId: "33333333-3333-3333-3333-333333333333",
      companyId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      companyName: "テスト会社",
      memberName: "鈴木 一郎",
    });
  });
});

describe("getDashboardData", () => {
  it("コンテキストが取得できなければ null を返す", async () => {
    queueResult("company_members", { data: null, error: null });

    const { getDashboardData } = await import(
      "@/features/company/app/dashboard/queries"
    );
    const result = await getDashboardData("unknown-user-id");

    expect(result).toBeNull();
  });

  it("各クエリの集計結果から DashboardData を組み立てる", async () => {
    queueResult("company_members", {
      data: {
        id: "33333333-3333-3333-3333-333333333333",
        last_name: "鈴木",
        first_name: "一郎",
        company_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        companies: {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          name: "テスト会社",
        },
      },
      error: null,
    });
    queueResult("students", { count: 10, data: null, error: null });
    queueResult("scouts", {
      data: [
        { status: "sent" },
        { status: "sent" },
        { status: "accepted" },
        { status: "declined" },
      ],
      error: null,
    });
    queueResult("chat_messages", { count: 3, data: null, error: null });
    queueResult("company_plans", {
      data: { scout_quota: 30, scouts_sent_this_month: 12 },
      error: null,
    });
    queueResult("scouts", {
      data: [
        {
          id: "scout-1",
          status: "accepted",
          sent_at: "2026-04-10T10:00:00Z",
          students: {
            id: "student-1",
            last_name: "佐藤",
            first_name: "志織",
            university: "東京大学",
            prefecture: "東京都",
          },
        },
      ],
      error: null,
    });

    const { getDashboardData } = await import(
      "@/features/company/app/dashboard/queries"
    );
    const data = await getDashboardData(
      "33333333-3333-3333-3333-333333333333",
    );

    expect(data).not.toBeNull();
    expect(data?.companyName).toBe("テスト会社");
    expect(data?.totals).toEqual({
      activeStudents: 10,
      totalScoutsSent: 4,
      acceptanceRate: 25,
      remainingScouts: 18,
    });
    expect(data?.unconfirmedMessages).toBe(3);
    expect(data?.activeStudents).toHaveLength(1);
    expect(data?.activeStudents[0]).toMatchObject({
      name: "佐藤 志織",
      status: "accepted",
      university: "東京大学",
    });
  });

  it("スカウトが0件なら承諾率は0%になる", async () => {
    queueResult("company_members", {
      data: {
        id: "user-1",
        last_name: "田中",
        first_name: null,
        company_id: "company-1",
        companies: { id: "company-1", name: "" },
      },
      error: null,
    });
    queueResult("students", { count: 0, data: null, error: null });
    queueResult("scouts", { data: [], error: null });
    queueResult("chat_messages", { count: 0, data: null, error: null });
    queueResult("company_plans", { data: null, error: null });
    queueResult("scouts", { data: [], error: null });

    const { getDashboardData } = await import(
      "@/features/company/app/dashboard/queries"
    );
    const data = await getDashboardData("user-1");

    expect(data?.totals.acceptanceRate).toBe(0);
    expect(data?.totals.remainingScouts).toBe(0);
    expect(data?.activeStudents).toHaveLength(0);
  });
});
