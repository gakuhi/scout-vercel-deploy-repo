import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "crypto";
import type { NextRequest } from "next/server";

const CHANNEL_SECRET = "test-channel-secret";

// Supabase admin mock
const upsertMock = vi.fn().mockResolvedValue({ error: null });
const updateMock = vi.fn();
const eqMock = vi.fn().mockResolvedValue({ error: null });
const selectMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

function sign(body: string): string {
  return createHmac("sha256", CHANNEL_SECRET).update(body).digest("base64");
}

function makeWebhookRequest(
  body: object,
  options: { signature?: string | null } = {},
): NextRequest {
  const rawBody = JSON.stringify(body);
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (options.signature !== null) {
    headers["x-line-signature"] = options.signature ?? sign(rawBody);
  }

  return new Request("http://localhost/api/line/webhook", {
    method: "POST",
    headers,
    body: rawBody,
  }) as unknown as NextRequest;
}

function makeFollowEvent(userId: string) {
  return {
    type: "follow",
    source: { type: "user", userId },
    timestamp: Date.now(),
    replyToken: "test-reply-token",
  };
}

function makeUnfollowEvent(userId: string) {
  return {
    type: "unfollow",
    source: { type: "user", userId },
    timestamp: Date.now(),
  };
}

function makeMessageEvent(userId: string) {
  return {
    type: "message",
    source: { type: "user", userId },
    timestamp: Date.now(),
    message: { type: "text", text: "hello" },
  };
}

const STUDENT_ID = "student-uuid-001";
const LINE_UID = "U1234567890abcdef";

describe("POST /api/line/webhook", () => {
  beforeEach(() => {
    vi.stubEnv("LINE_CHANNEL_SECRET", CHANNEL_SECRET);
    fromMock.mockReset();
    upsertMock.mockReset().mockResolvedValue({ error: null });
    updateMock.mockReset();
    eqMock.mockReset().mockResolvedValue({ error: null });
    selectMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  // ------------------------------------------------
  // 署名検証
  // ------------------------------------------------

  it("X-Line-Signature ヘッダが無ければ 401", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      makeWebhookRequest({ destination: "xxx", events: [] }, { signature: null }),
    );
    expect(res.status).toBe(401);
  });

  it("署名が不正なら 401", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      makeWebhookRequest(
        { destination: "xxx", events: [] },
        { signature: "invalid-signature" },
      ),
    );
    expect(res.status).toBe(401);
  });

  it("署名が正しければ 200", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      makeWebhookRequest({ destination: "xxx", events: [] }),
    );
    expect(res.status).toBe(200);
  });

  // ------------------------------------------------
  // follow イベント
  // ------------------------------------------------

  it("follow イベントで line_friendships に is_friend=true で UPSERT", async () => {
    // students 検索 mock
    fromMock.mockImplementation((table: string) => {
      if (table === "students") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { id: STUDENT_ID }, error: null }),
            }),
          }),
        };
      }
      if (table === "line_friendships") {
        return { upsert: upsertMock };
      }
      return {};
    });

    const { POST } = await import("../route");
    const body = { destination: "xxx", events: [makeFollowEvent(LINE_UID)] };
    const res = await POST(makeWebhookRequest(body));

    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledOnce();
    const [upsertData, upsertOptions] = upsertMock.mock.calls[0];
    expect(upsertData.student_id).toBe(STUDENT_ID);
    expect(upsertData.line_uid).toBe(LINE_UID);
    expect(upsertData.is_friend).toBe(true);
    expect(upsertData.followed_at).toBeDefined();
    expect(upsertData.unfollowed_at).toBeNull();
    expect(upsertOptions.onConflict).toBe("student_id");
  });

  // ------------------------------------------------
  // unfollow イベント
  // ------------------------------------------------

  it("unfollow イベントで is_friend=false, unfollowed_at を更新", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "students") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { id: STUDENT_ID }, error: null }),
            }),
          }),
        };
      }
      if (table === "line_friendships") {
        return {
          update: (data: Record<string, unknown>) => {
            updateMock(data);
            return {
              eq: eqMock,
            };
          },
        };
      }
      return {};
    });

    const { POST } = await import("../route");
    const body = { destination: "xxx", events: [makeUnfollowEvent(LINE_UID)] };
    const res = await POST(makeWebhookRequest(body));

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledOnce();
    const updateData = updateMock.mock.calls[0][0];
    expect(updateData.is_friend).toBe(false);
    expect(updateData.unfollowed_at).toBeDefined();
    expect(eqMock).toHaveBeenCalledWith("student_id", STUDENT_ID);
  });

  // ------------------------------------------------
  // 突合できないケース
  // ------------------------------------------------

  it("students.line_uid で突合できなければ warn ログ + 200 OK", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    fromMock.mockImplementation((table: string) => {
      if (table === "students") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const { POST } = await import("../route");
    const body = {
      destination: "xxx",
      events: [makeFollowEvent("U_unknown_user")],
    };
    const res = await POST(makeWebhookRequest(body));

    expect(res.status).toBe(200);
    expect(warnSpy).toHaveBeenCalled();
    // line_friendships は呼ばれない
    expect(upsertMock).not.toHaveBeenCalled();
  });

  // ------------------------------------------------
  // follow → unfollow → follow の連続
  // ------------------------------------------------

  it("follow → unfollow → follow で UNIQUE 制約に違反しない", async () => {
    let callCount = 0;

    fromMock.mockImplementation((table: string) => {
      if (table === "students") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { id: STUDENT_ID }, error: null }),
            }),
          }),
        };
      }
      if (table === "line_friendships") {
        callCount++;
        if (callCount === 1 || callCount === 3) {
          // follow → upsert
          return { upsert: upsertMock };
        }
        // unfollow → update
        return {
          update: (data: Record<string, unknown>) => {
            updateMock(data);
            return { eq: eqMock };
          },
        };
      }
      return {};
    });

    const { POST } = await import("../route");
    const body = {
      destination: "xxx",
      events: [
        makeFollowEvent(LINE_UID),
        makeUnfollowEvent(LINE_UID),
        makeFollowEvent(LINE_UID),
      ],
    };
    const res = await POST(makeWebhookRequest(body));

    expect(res.status).toBe(200);
    // follow が2回、unfollow が1回
    expect(upsertMock).toHaveBeenCalledTimes(2);
    expect(updateMock).toHaveBeenCalledOnce();
  });

  // ------------------------------------------------
  // 未対応イベント
  // ------------------------------------------------

  it("message イベントは無視して 200 を返し、line_friendships を変更しない", async () => {
    const { POST } = await import("../route");
    const body = {
      destination: "xxx",
      events: [makeMessageEvent(LINE_UID)],
    };
    const res = await POST(makeWebhookRequest(body));

    expect(res.status).toBe(200);
    // from() 自体呼ばれない（follow/unfollow 以外スキップ）
    expect(fromMock).not.toHaveBeenCalled();
  });
});
