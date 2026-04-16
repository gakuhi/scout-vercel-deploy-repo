import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const verifyOtpMock = vi.fn();
const createClientMock = vi.fn(() => ({
  auth: {
    verifyOtp: verifyOtpMock,
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

beforeEach(() => {
  verifyOtpMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

function buildRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/company/confirm");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const nextUrl = Object.assign(new URL(url.toString()), {
    clone: () => new URL(url.toString()),
  });
  return {
    url: url.toString(),
    nextUrl,
  } as unknown as NextRequest;
}

describe("GET /company/confirm", () => {
  it("token_hash と type がない場合は /company/login にリダイレクトする", async () => {
    const { GET } = await import(
      "@/app/company/(auth)/confirm/route"
    );
    const request = buildRequest({});

    const response = await GET(request);

    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/company/login");
    expect(location.searchParams.get("error_code")).toBe("otp_expired");
  });

  it("verifyOtp が成功した場合はデフォルトで /company/dashboard にリダイレクトする", async () => {
    verifyOtpMock.mockResolvedValue({ error: null });
    const { GET } = await import(
      "@/app/company/(auth)/confirm/route"
    );
    const request = buildRequest({
      token_hash: "abc123",
      type: "recovery",
    });

    const response = await GET(request);

    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/company/dashboard");
    expect(verifyOtpMock).toHaveBeenCalledWith({
      type: "recovery",
      token_hash: "abc123",
    });
  });

  it("next パラメータが指定されている場合はそのパスにリダイレクトする", async () => {
    verifyOtpMock.mockResolvedValue({ error: null });
    const { GET } = await import(
      "@/app/company/(auth)/confirm/route"
    );
    const request = buildRequest({
      token_hash: "abc123",
      type: "recovery",
      next: "/company/reset-password",
    });

    const response = await GET(request);

    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/company/reset-password");
  });

  it("verifyOtp が失敗した場合は /company/login にリダイレクトする", async () => {
    verifyOtpMock.mockResolvedValue({
      error: { message: "Token has expired" },
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import(
      "@/app/company/(auth)/confirm/route"
    );
    const request = buildRequest({
      token_hash: "expired-token",
      type: "recovery",
    });

    const response = await GET(request);

    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/company/login");
    expect(location.searchParams.get("error_code")).toBe("otp_expired");
    consoleErrorSpy.mockRestore();
  });
});
