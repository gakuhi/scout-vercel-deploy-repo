import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// updateSession モック
const mockUpdateSession = vi.fn();
vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}));

function createRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, "http://localhost:3000"));
}

function mockSession(user: { app_metadata?: Record<string, string> } | null) {
  mockUpdateSession.mockResolvedValue({
    user,
    supabaseResponse: NextResponse.next(),
  });
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("パブリックルート（/student/login）は認証なしでアクセスできる", async () => {
    mockSession(null);
    const { middleware } = await import("@/middleware");
    const response = await middleware(createRequest("/student/login"));

    expect(response.status).toBe(200);
  });

  it("パブリックルート（/company/login）は認証なしでアクセスできる", async () => {
    mockSession(null);
    const { middleware } = await import("@/middleware");
    const response = await middleware(createRequest("/company/login"));

    expect(response.status).toBe(200);
  });

  it("パブリックルート（/api/auth/）は認証なしでアクセスできる", async () => {
    mockSession(null);
    const { middleware } = await import("@/middleware");
    const response = await middleware(createRequest("/api/student/auth/line"));

    expect(response.status).toBe(200);
  });

  it("ログイン済み学生が /student/login にアクセスするとダッシュボードにリダイレクトされる", async () => {
    mockSession({ app_metadata: { role: "student" } });
    const { middleware } = await import("@/middleware");
    const response = await middleware(createRequest("/student/login"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/student/dashboard");
  });

  it("未認証ユーザーが /student/* にアクセスすると /student/login にリダイレクトされる", async () => {
    mockSession(null);
    const { middleware } = await import("@/middleware");
    const response = await middleware(createRequest("/student/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/student/login");
    expect(response.headers.get("location")).toContain("redirectTo");
  });

  it("未認証ユーザーが /company/* にアクセスすると /company/login にリダイレクトされる", async () => {
    mockSession(null);
    const { middleware } = await import("@/middleware");
    const response = await middleware(createRequest("/company/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/company/login");
    expect(response.headers.get("location")).toContain("redirectTo");
  });

  it("student ロールのユーザーは /student/* にアクセスできる", async () => {
    mockSession({ app_metadata: { role: "student" } });
    const { middleware } = await import("@/middleware");
    const response = await middleware(createRequest("/student/dashboard"));

    expect(response.status).toBe(200);
  });

  it("student 以外のロールが /student/* にアクセスすると unauthorized エラーでリダイレクトされる", async () => {
    mockSession({ app_metadata: { role: "company_owner" } });
    const { middleware } = await import("@/middleware");
    const response = await middleware(createRequest("/student/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/student/login");
    expect(response.headers.get("location")).toContain("error=unauthorized");
  });
});
