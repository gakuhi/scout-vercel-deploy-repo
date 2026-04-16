import { describe, it, expect, vi, beforeEach } from "vitest";

const mockJwtVerify = vi.fn();
vi.mock("jose", () => ({
  jwtVerify: mockJwtVerify,
}));

describe("lib/line/token", () => {
  beforeEach(() => {
    vi.stubEnv("LINE_LOGIN_CHANNEL_ID", "test-channel-id");
    vi.stubEnv("LINE_LOGIN_CHANNEL_SECRET", "test-channel-secret");
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "http://localhost:3000");
    vi.restoreAllMocks();
  });

  describe("exchangeCodeForTokens", () => {
    it("認証コードをトークンに交換する", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "access",
            id_token: "id-token",
          }),
      });

      const { exchangeCodeForTokens } = await import("../token");
      const result = await exchangeCodeForTokens("auth-code");

      expect(result).toEqual({
        accessToken: "access",
        idToken: "id-token",
      });
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.line.me/oauth2/v2.1/token",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("トークン交換が失敗した場合エラーを投げる", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve("Bad Request"),
      });

      const { exchangeCodeForTokens } = await import("../token");
      await expect(exchangeCodeForTokens("bad-code")).rejects.toThrow(
        "LINE token exchange failed",
      );
    });
  });

  describe("verifyIdToken", () => {
    it("ID token を検証してペイロードを返す", async () => {
      const payload = {
        iss: "https://access.line.me",
        sub: "U1234567890",
        aud: "test-channel-id",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        name: "テストユーザー",
        picture: "https://example.com/pic.jpg",
      };
      mockJwtVerify.mockResolvedValue({ payload });

      const { verifyIdToken } = await import("../token");
      const result = await verifyIdToken("valid-token");

      expect(result).toEqual(payload);
      expect(mockJwtVerify).toHaveBeenCalledWith(
        "valid-token",
        expect.any(Uint8Array),
        {
          algorithms: ["HS256"],
          issuer: "https://access.line.me",
          audience: "test-channel-id",
        },
      );
    });

    it("nonce を渡した場合に検証する", async () => {
      mockJwtVerify.mockResolvedValue({
        payload: { nonce: "wrong-nonce" },
      });

      const { verifyIdToken } = await import("../token");
      await expect(
        verifyIdToken("token", "expected-nonce"),
      ).rejects.toThrow("LINE id_token の nonce が一致しません");
    });

    it("nonce を渡さない場合は nonce 検証をスキップする", async () => {
      const payload = {
        sub: "U1234567890",
        nonce: "some-nonce",
      };
      mockJwtVerify.mockResolvedValue({ payload });

      const { verifyIdToken } = await import("../token");
      const result = await verifyIdToken("token");
      expect(result.sub).toBe("U1234567890");
    });
  });
});
