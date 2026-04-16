import { describe, it, expect, vi, beforeEach } from "vitest";

describe("lib/line/hmac", () => {
  beforeEach(() => {
    vi.stubEnv("SCOUT_HMAC_SECRET_SMARTES", "test-secret-smartes");
    vi.stubEnv("SCOUT_HMAC_SECRET_INTERVIEWAI", "test-secret-interviewai");
  });

  it("正しい署名を検証できる", async () => {
    const { generateHmacSignature, verifyHmacSignature } = await import(
      "../hmac"
    );
    const signature = generateHmacSignature(
      "smartes",
      "user-123",
      "https://smartes.example.com/callback",
      "test-secret-smartes",
    );

    expect(
      verifyHmacSignature(
        "smartes",
        "user-123",
        "https://smartes.example.com/callback",
        signature,
      ),
    ).toBe(true);
  });

  it("不正な署名を拒否する", async () => {
    const { verifyHmacSignature } = await import("../hmac");

    expect(
      verifyHmacSignature(
        "smartes",
        "user-123",
        "https://smartes.example.com/callback",
        "invalid-hex-signature",
      ),
    ).toBe(false);
  });

  it("未知のソースでエラーを投げる", async () => {
    const { verifyHmacSignature } = await import("../hmac");

    expect(() =>
      verifyHmacSignature("unknown", "user-123", "https://example.com", "sig"),
    ).toThrow("Unknown source: unknown");
  });

  it("環境変数が未設定の場合エラーを投げる", async () => {
    vi.stubEnv("SCOUT_HMAC_SECRET_SMARTES", "");
    const { verifyHmacSignature } = await import("../hmac");

    expect(() =>
      verifyHmacSignature(
        "smartes",
        "user-123",
        "https://example.com",
        "sig",
      ),
    ).toThrow("環境変数 SCOUT_HMAC_SECRET_SMARTES が未設定です");
  });
});
