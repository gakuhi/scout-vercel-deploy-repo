import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomBytes } from "crypto";

describe("lib/line/state", () => {
  beforeEach(() => {
    // 32バイトのテスト用暗号化キーを生成
    const testKey = randomBytes(32).toString("hex");
    vi.stubEnv("SCOUT_STATE_ENCRYPTION_KEY", testKey);
  });

  it("state を暗号化して復号できる", async () => {
    const { encryptState, decryptState } = await import("../state");

    const payload = {
      origin: "smartes",
      sourceUserId: "user-123",
      callbackUrl: "https://smartes.example.com/callback",
      csrfToken: "csrf-token-abc",
      expiresAt: Math.floor(Date.now() / 1000) + 600,
    };

    const encrypted = encryptState(payload);
    const decrypted = decryptState(encrypted);

    expect(decrypted).toEqual(payload);
  });

  it("直接ログインの state（sourceUserId/callbackUrl なし）を暗号化・復号できる", async () => {
    const { encryptState, decryptState } = await import("../state");

    const payload = {
      origin: "direct",
      csrfToken: "csrf-token-xyz",
      expiresAt: Math.floor(Date.now() / 1000) + 600,
    };

    const encrypted = encryptState(payload);
    const decrypted = decryptState(encrypted);

    expect(decrypted.origin).toBe("direct");
    expect(decrypted.sourceUserId).toBeUndefined();
  });

  it("有効期限切れの state は復号時にエラーを投げる", async () => {
    const { encryptState, decryptState } = await import("../state");

    const payload = {
      origin: "direct",
      csrfToken: "csrf-token",
      expiresAt: Math.floor(Date.now() / 1000) - 1, // 過去
    };

    const encrypted = encryptState(payload);

    expect(() => decryptState(encrypted)).toThrow("State has expired");
  });

  it("改ざんされた state は復号に失敗する", async () => {
    const { encryptState, decryptState } = await import("../state");

    const payload = {
      origin: "direct",
      csrfToken: "csrf-token",
      expiresAt: Math.floor(Date.now() / 1000) + 600,
    };

    const encrypted = encryptState(payload);
    const tampered = encrypted.slice(0, -2) + "xx";

    expect(() => decryptState(tampered)).toThrow();
  });

  it("CSRFトークンを生成できる", async () => {
    const { generateCsrfToken } = await import("../state");

    const token1 = generateCsrfToken();
    const token2 = generateCsrfToken();

    expect(token1).toHaveLength(64); // 32バイト = 64文字の16進数
    expect(token1).not.toBe(token2);
  });

  it("暗号化キーが未設定の場合エラーを投げる", async () => {
    vi.stubEnv("SCOUT_STATE_ENCRYPTION_KEY", "");
    const { encryptState } = await import("../state");

    expect(() =>
      encryptState({
        origin: "direct",
        csrfToken: "test",
        expiresAt: Math.floor(Date.now() / 1000) + 600,
      }),
    ).toThrow("環境変数 SCOUT_STATE_ENCRYPTION_KEY が未設定です");
  });
});
