import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const syncUserMock = vi.fn();
const syncAllConsentedMock = vi.fn();

vi.mock("@/lib/sync/interviewai", () => ({
  syncUser: syncUserMock,
  syncAllConsented: syncAllConsentedMock,
}));

function makeRequest(
  init: Partial<{ authorization: string | null; body: unknown }> = {},
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
  return new Request("http://localhost/api/sync/interviewai", {
    method: "POST",
    headers,
    body: bodyString,
  }) as unknown as NextRequest;
}

describe("POST /api/sync/interviewai", () => {
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
  });

  it("CRON_SECRET が一致しないと 401", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("認証 OK + body なしなら syncAllConsented", async () => {
    syncAllConsentedMock.mockResolvedValue({
      product: "interviewai",
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
  });

  it("body に external_user_id があれば syncUser", async () => {
    syncUserMock.mockResolvedValue({
      product: "interviewai",
      externalUserId: "uuid-xyz",
      ok: true,
      upserted: {},
      errors: [],
    });
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({
        authorization: "Bearer test-secret",
        body: { external_user_id: "uuid-xyz" },
      }),
    );
    expect(res.status).toBe(200);
    expect(syncUserMock).toHaveBeenCalledWith("uuid-xyz");
  });

  it("syncUser が throw したら 500", async () => {
    syncUserMock.mockRejectedValue(new Error("pooler error"));
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({
        authorization: "Bearer test-secret",
        body: { external_user_id: "uuid-xyz" },
      }),
    );
    expect(res.status).toBe(500);
  });
});
