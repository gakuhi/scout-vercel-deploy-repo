import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const syncUserMock = vi.fn();
const syncAllConsentedMock = vi.fn();

vi.mock("@/lib/sync/sugoshu", () => ({
  syncUser: syncUserMock,
  syncAllConsented: syncAllConsentedMock,
}));

function makeRequest(
  init: Partial<{
    authorization: string | null;
    body: unknown;
  }> = {},
): NextRequest {
  const headers: Record<string, string> = {};
  if (init.authorization !== null && init.authorization !== undefined) {
    headers.authorization = init.authorization;
  }
  let bodyString: string | undefined;
  if (init.body !== undefined) {
    bodyString = JSON.stringify(init.body);
    headers["content-type"] = "application/json";
    headers["content-length"] = String(bodyString.length);
  }
  return new Request("http://localhost/api/sync/sugoshu", {
    method: "POST",
    headers,
    body: bodyString,
  }) as unknown as NextRequest;
}

describe("POST /api/sync/sugoshu", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    syncUserMock.mockReset();
    syncAllConsentedMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("Authorization ヘッダ無しなら 401", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ authorization: null }));
    expect(res.status).toBe(401);
    expect(syncUserMock).not.toHaveBeenCalled();
    expect(syncAllConsentedMock).not.toHaveBeenCalled();
  });

  it("CRON_SECRET が一致しないと 401", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("認証 OK + body なしなら syncAllConsented を呼ぶ（200）", async () => {
    syncAllConsentedMock.mockResolvedValue({
      product: "sugoshu",
      usersProcessed: 0,
      usersSucceeded: 0,
      usersFailed: 0,
      upsertedTotal: {},
      errors: [],
    });
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(200);
    expect(syncAllConsentedMock).toHaveBeenCalledOnce();
    expect(syncUserMock).not.toHaveBeenCalled();
  });

  it("認証 OK + external_user_id があれば syncUser を呼ぶ", async () => {
    syncUserMock.mockResolvedValue({
      product: "sugoshu",
      externalUserId: "abc",
      ok: true,
      upserted: { synced_sugoshu_users: 1 },
      errors: [],
    });
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({
        authorization: "Bearer test-secret",
        body: { external_user_id: "abc" },
      }),
    );
    expect(res.status).toBe(200);
    expect(syncUserMock).toHaveBeenCalledWith("abc");
    expect(syncAllConsentedMock).not.toHaveBeenCalled();
  });

  it("syncUser 結果が ok: false なら 207 multi-status を返す", async () => {
    syncUserMock.mockResolvedValue({
      product: "sugoshu",
      externalUserId: "abc",
      ok: false,
      upserted: {},
      errors: ["fake error"],
    });
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({
        authorization: "Bearer test-secret",
        body: { external_user_id: "abc" },
      }),
    );
    expect(res.status).toBe(207);
    const json = await res.json();
    expect(json.errors).toEqual(["fake error"]);
  });

  it("syncAllConsented で usersFailed > 0 のとき 207 を返す", async () => {
    syncAllConsentedMock.mockResolvedValue({
      product: "sugoshu",
      usersProcessed: 5,
      usersSucceeded: 3,
      usersFailed: 2,
      upsertedTotal: {},
      errors: ["x: boom"],
    });
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(207);
  });

  it("syncUser が throw したら 500 を返す", async () => {
    syncUserMock.mockRejectedValue(new Error("DB down"));
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({
        authorization: "Bearer test-secret",
        body: { external_user_id: "abc" },
      }),
    );
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("DB down");
  });

  it("external_user_id が文字列以外なら syncAllConsented 側として扱う", async () => {
    syncAllConsentedMock.mockResolvedValue({
      product: "sugoshu",
      usersProcessed: 0,
      usersSucceeded: 0,
      usersFailed: 0,
      upsertedTotal: {},
      errors: [],
    });
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({
        authorization: "Bearer test-secret",
        body: { external_user_id: 42 }, // number
      }),
    );
    expect(res.status).toBe(200);
    expect(syncUserMock).not.toHaveBeenCalled();
    expect(syncAllConsentedMock).toHaveBeenCalledOnce();
  });
});
