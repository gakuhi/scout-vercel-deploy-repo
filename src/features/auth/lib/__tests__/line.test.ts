import { describe, it, expect, vi, beforeEach } from "vitest";

// jose モック
const mockJwtVerify = vi.fn();
vi.mock("jose", () => ({
  jwtVerify: mockJwtVerify,
}));

describe("line.ts", () => {
  beforeEach(() => {
    vi.stubEnv("LINE_CHANNEL_ID", "test-channel-id");
    vi.stubEnv("LINE_CHANNEL_SECRET", "test-channel-secret");
    vi.stubEnv("LINE_REDIRECT_URI", "http://localhost:3000/api/auth/line/callback");
    vi.restoreAllMocks();
  });

  describe("generateLineAuthUrl", () => {
    it("LINE 認証 URL を正しく生成する", async () => {
      const { generateLineAuthUrl } = await import("../line");
      const url = generateLineAuthUrl("test-state", "test-nonce");

      expect(url).toContain("https://access.line.me/oauth2/v2.1/authorize");
      expect(url).toContain("client_id=test-channel-id");
      expect(url).toContain("state=test-state");
      expect(url).toContain("nonce=test-nonce");
      expect(url).toContain("scope=profile+openid+email");
      expect(url).toContain("response_type=code");
      expect(url).toContain(
        "redirect_uri=" +
          encodeURIComponent("http://localhost:3000/api/auth/line/callback"),
      );
    });

    it("環境変数が未設定の場合エラーを投げる", async () => {
      vi.stubEnv("LINE_CHANNEL_ID", "");
      const { generateLineAuthUrl } = await import("../line");
      expect(() => generateLineAuthUrl("s", "n")).toThrow(
        "LINE_CHANNEL_ID, LINE_CHANNEL_SECRET, LINE_REDIRECT_URI が設定されていません",
      );
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("認証コードをトークンに交換する", async () => {
      const tokenResponse = {
        access_token: "access",
        expires_in: 3600,
        id_token: "id-token",
        refresh_token: "refresh",
        scope: "profile openid email",
        token_type: "Bearer" as const,
      };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(tokenResponse),
      });

      const { exchangeCodeForTokens } = await import("../line");
      const result = await exchangeCodeForTokens("auth-code");

      expect(result).toEqual(tokenResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.line.me/oauth2/v2.1/token",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("トークン交換が失敗した場合エラーを投げる", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Bad Request"),
      });

      const { exchangeCodeForTokens } = await import("../line");
      await expect(exchangeCodeForTokens("bad-code")).rejects.toThrow(
        "LINE token exchange failed: 400 Bad Request",
      );
    });
  });

  describe("verifyAndDecodeIdToken", () => {
    it("id_token を検証してペイロードを返す", async () => {
      const payload = {
        iss: "https://access.line.me",
        sub: "U1234567890",
        aud: "test-channel-id",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        nonce: "test-nonce",
        name: "テストユーザー",
        picture: "https://example.com/pic.jpg",
      };
      mockJwtVerify.mockResolvedValue({ payload });

      const { verifyAndDecodeIdToken } = await import("../line");
      const result = await verifyAndDecodeIdToken("valid-token", "test-nonce");

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

    it("nonce が一致しない場合エラーを投げる", async () => {
      mockJwtVerify.mockResolvedValue({
        payload: { nonce: "wrong-nonce" },
      });

      const { verifyAndDecodeIdToken } = await import("../line");
      await expect(
        verifyAndDecodeIdToken("token", "expected-nonce"),
      ).rejects.toThrow("LINE id_token の nonce が一致しません");
    });
  });
});
