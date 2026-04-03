import { describe, it, expect, vi, beforeEach } from "vitest";

const mockResend = vi.fn();

vi.mock("resend", () => ({
  Resend: mockResend,
}));

beforeEach(() => {
  vi.resetModules();
  mockResend.mockClear();
});

describe("getResend", () => {
  it("RESEND_API_KEY を使って Resend インスタンスを生成する", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_123");

    const { getResend } = await import("@/lib/resend/client");
    getResend();

    expect(mockResend).toHaveBeenCalledWith("re_test_123");
  });

  it("RESEND_API_KEY が未設定の場合エラーを投げる", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    const { getResend } = await import("@/lib/resend/client");

    expect(() => getResend()).toThrow("RESEND_API_KEY が設定されていません");
  });
});
