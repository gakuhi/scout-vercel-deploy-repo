import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const syncUserMock = vi.fn();
const syncAllConsentedMock = vi.fn();

vi.mock("@/lib/sync/compai", () => ({
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
  return new Request("http://localhost/api/sync/compai", {
    method: "POST",
    headers,
    body: bodyString,
  }) as unknown as NextRequest;
}

describe("POST /api/sync/compai", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    syncUserMock.mockReset();
    syncAllConsentedMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("Authorization 無しで 401", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ authorization: null }));
    expect(res.status).toBe(401);
  });

  it("secret 不一致で 401", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ authorization: "Bearer x" }));
    expect(res.status).toBe(401);
  });

  it("認証 OK + body なしで syncAllConsented 呼ばれる", async () => {
    syncAllConsentedMock.mockResolvedValue({
      product: "compai",
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
      product: "compai",
      externalUserId: "p-1",
      ok: true,
      upserted: {},
      errors: [],
    });
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({
        authorization: "Bearer test-secret",
        body: { external_user_id: "p-1" },
      }),
    );
    expect(res.status).toBe(200);
    expect(syncUserMock).toHaveBeenCalledWith("p-1");
  });

  it("syncUser が throw したら 500", async () => {
    syncUserMock.mockRejectedValue(new Error("boom"));
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({
        authorization: "Bearer test-secret",
        body: { external_user_id: "p-1" },
      }),
    );
    expect(res.status).toBe(500);
  });
});
