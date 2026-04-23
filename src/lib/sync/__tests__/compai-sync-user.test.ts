import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * compai の syncUser を end-to-end（mock した外部 DB + Supabase admin）で検証する。
 *
 * mock 対象:
 *   - `postgres`: tagged template literal を関数として呼べるオブジェクト
 *   - `@/lib/supabase/admin`: createAdminClient()
 *
 * 他プロダクトも同じパターンで書けるが、代表として compai をフル実装する。
 */

// ---------------------------------------------------------------
// postgres（tagged template literal）の mock
// ---------------------------------------------------------------

type QueryResult = unknown[];
type QueueItem = QueryResult | Error;
let queryQueue: QueueItem[] = [];

function pgTagMock() {
  // postgres() は tagged template 呼び出しと通常関数呼び出しの両方を受け付ける。
  // ここでは引数を一切見ず、キューから結果を返す Promise を模倣する。
  // キュー要素が Error のときは reject し、Promise.allSettled の rejected 分岐を再現する。
  const next = queryQueue.shift() ?? [];
  if (next instanceof Error) return Promise.reject(next);
  return Promise.resolve(next);
}
// sql.end({ timeout }) も対応
(pgTagMock as unknown as { end: () => Promise<void> }).end = async () => {
  return;
};

vi.mock("postgres", () => ({
  default: vi.fn(() => pgTagMock),
}));

// ---------------------------------------------------------------
// Supabase admin client の mock
// ---------------------------------------------------------------

type MockResult = { data?: unknown; error?: { message: string } | null };

type TableCallLog = {
  table: string;
  op: "upsert" | "select" | "delete";
  payload?: unknown;
};

const tableCalls: TableCallLog[] = [];
const upsertResults = new Map<string, MockResult>();
const selectResults = new Map<string, MockResult>();
const deleteResults = new Map<string, MockResult>();

function makeFromChain(tableName: string) {
  return {
    upsert(rows: unknown) {
      tableCalls.push({ table: tableName, op: "upsert", payload: rows });
      return Promise.resolve(upsertResults.get(tableName) ?? { error: null });
    },
    select() {
      const chain: Record<string, unknown> = {};
      chain.eq = vi.fn(() => {
        tableCalls.push({ table: tableName, op: "select" });
        return Promise.resolve(selectResults.get(tableName) ?? { data: [], error: null });
      });
      return chain;
    },
    delete() {
      const chain: Record<string, unknown> = {};
      chain.in = vi.fn((_col: string, ids: unknown) => {
        tableCalls.push({ table: tableName, op: "delete", payload: ids });
        return Promise.resolve(deleteResults.get(tableName) ?? { error: null });
      });
      return chain;
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => makeFromChain(table),
  }),
}));

// ---------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------

describe("lib/sync/compai syncUser (end-to-end with mocks)", () => {
  beforeEach(() => {
    vi.stubEnv("COMPAI_DB_URL", "postgres://fake");
    queryQueue = [];
    tableCalls.length = 0;
    upsertResults.clear();
    selectResults.clear();
    deleteResults.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("profiles / researches / messages がすべて取得できた場合、対応する synced_* に UPSERT する", async () => {
    // queryQueue の順番: profiles → researches → messages（Promise.allSettled に渡した順）
    queryQueue = [
      [{ user_id: "user-abc", created_at: new Date("2026-01-01T00:00:00Z") }],
      [
        {
          id: "r1",
          user_id: "user-abc",
          title: "企業 A 調査",
          url: "https://a.example",
          content: "AI 結果",
          raw_content: "元データ",
          is_bookmarked: false,
          status: "done",
          original_created_at: new Date("2026-01-02T00:00:00Z"),
        },
      ],
      [
        {
          id: "m1",
          research_id: "r1",
          user_id: "user-abc",
          content: "質問 A",
          sender_type: "user",
          original_created_at: new Date("2026-01-02T01:00:00Z"),
        },
      ],
    ];

    const { syncUser } = await import("../compai");
    const result = await syncUser("user-abc");

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.upserted.synced_compai_users).toBe(1);
    expect(result.upserted.synced_compai_researches).toBe(1);
    expect(result.upserted.synced_compai_messages).toBe(1);

    const tables = tableCalls
      .filter((c) => c.op === "upsert")
      .map((c) => c.table);
    expect(tables).toEqual(
      expect.arrayContaining([
        "synced_compai_users",
        "synced_compai_researches",
        "synced_compai_messages",
      ]),
    );
  });

  it("researches / messages が空配列なら errors 無しで 0 件扱い（UPSERT は走らない）", async () => {
    queryQueue = [
      [{ user_id: "user-abc", created_at: new Date("2026-01-01T00:00:00Z") }],
      [],
      [],
    ];

    const { syncUser } = await import("../compai");
    const result = await syncUser("user-abc");

    expect(result.ok).toBe(true);
    expect(result.upserted.synced_compai_users).toBe(1);
    expect(result.upserted.synced_compai_researches).toBeUndefined();
    expect(result.upserted.synced_compai_messages).toBeUndefined();
    expect(result.errors).toEqual([]);
  });

  it("profiles SELECT が reject されたら errors に記録され ok=false（researches/messages は続行）", async () => {
    queryQueue = [
      new Error("profiles boom"),
      [
        {
          id: "r1",
          user_id: "user-abc",
          title: "x",
          url: null,
          content: null,
          raw_content: null,
          is_bookmarked: false,
          status: null,
          original_created_at: new Date(),
        },
      ],
      [],
    ];

    const { syncUser } = await import("../compai");
    const result = await syncUser("user-abc");

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("profiles SELECT 失敗: profiles boom");
    // users は UPSERT されない
    expect(result.upserted.synced_compai_users).toBeUndefined();
    // researches は続行される
    expect(result.upserted.synced_compai_researches).toBe(1);
  });

  it("researches SELECT が reject されたら errors に記録され ok=false（users/messages は続行）", async () => {
    queryQueue = [
      [{ user_id: "user-abc", created_at: new Date("2026-01-01T00:00:00Z") }],
      new Error("researches boom"),
      [],
    ];

    const { syncUser } = await import("../compai");
    const result = await syncUser("user-abc");

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("researches SELECT 失敗: researches boom");
    // users は UPSERT 成功
    expect(result.upserted.synced_compai_users).toBe(1);
    // researches は失敗してるので UPSERT も reconciliation の DELETE も起きない
    expect(result.upserted.synced_compai_researches).toBeUndefined();
    const researchesOps = tableCalls.filter(
      (c) => c.table === "synced_compai_researches",
    );
    expect(researchesOps).toEqual([]);
  });

  it("research_messages SELECT が reject されたら errors に記録され ok=false（users は続行）", async () => {
    queryQueue = [
      [{ user_id: "user-abc", created_at: new Date("2026-01-01T00:00:00Z") }],
      [],
      new Error("messages boom"),
    ];

    const { syncUser } = await import("../compai");
    const result = await syncUser("user-abc");

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "research_messages SELECT 失敗: messages boom",
    );
    expect(result.upserted.synced_compai_users).toBe(1);
    expect(result.upserted.synced_compai_messages).toBeUndefined();
    const messagesOps = tableCalls.filter(
      (c) => c.table === "synced_compai_messages",
    );
    expect(messagesOps).toEqual([]);
  });

  it("UPSERT でエラーが返ると errors に積まれ ok=false になる", async () => {
    queryQueue = [
      [{ user_id: "user-abc", created_at: new Date("2026-01-01T00:00:00Z") }],
      [
        {
          id: "r1",
          user_id: "user-abc",
          title: "x",
          url: null,
          content: null,
          raw_content: null,
          is_bookmarked: false,
          status: null,
          original_created_at: new Date(),
        },
      ],
      [],
    ];
    upsertResults.set("synced_compai_researches", {
      error: { message: "unique violation" },
    });

    const { syncUser } = await import("../compai");
    const result = await syncUser("user-abc");

    expect(result.ok).toBe(false);
    expect(
      result.errors.some((e) => e.includes("synced_compai_researches upsert")),
    ).toBe(true);
  });

  it("COMPAI_DB_URL が未設定ならエラーを投げる（pgConnect 内で throw）", async () => {
    vi.stubEnv("COMPAI_DB_URL", "");
    const { syncUser } = await import("../compai");
    // syncUser は throw せず errors に積まれる設計ではなく、pgConnect の throw が
    // try ブロック外で起きる（sql = pgConnect() の段階）。外側でキャッチされないため
    // Promise が reject される。
    await expect(syncUser("user-abc")).rejects.toThrow(/COMPAI_DB_URL/);
  });
});
