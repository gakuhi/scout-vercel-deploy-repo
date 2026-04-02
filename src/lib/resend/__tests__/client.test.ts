import { describe, it, expect, vi } from "vitest";

const mockResend = vi.fn();

vi.mock("resend", () => ({
  Resend: mockResend,
}));

describe("Resend クライアント", () => {
  it("RESEND_API_KEY を使って Resend インスタンスを生成する", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_123");

    await import("@/lib/resend/client");

    expect(mockResend).toHaveBeenCalledWith("re_test_123");
  });
});
