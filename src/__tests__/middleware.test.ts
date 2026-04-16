import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const updateSessionMock = vi.fn();
const nextResponseMock = { __isNext: true } as const;

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: updateSessionMock,
}));

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: vi.fn((url: URL) => ({ __redirectTo: url.toString() })),
  },
}));

beforeEach(() => {
  updateSessionMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

type RequestOptions = {
  pathname: string;
};

function buildRequest({ pathname }: RequestOptions) {
  const url = new URL(`http://localhost:3000${pathname}`);
  return {
    nextUrl: {
      pathname: url.pathname,
      searchParams: url.searchParams,
      clone: () => {
        // 実際の Next.js NextURL.clone() と同様にミュータブルなコピーを返す
        const cloned = new URL(url.toString());
        return cloned;
      },
    },
    cookies: {
      getAll: () => [],
      set: vi.fn(),
    },
  };
}

function buildUser(role: string | null) {
  return {
    id: "user-id",
    app_metadata: role ? { role } : {},
  };
}

describe("middleware", () => {
  it("認証済みでない /company/* アクセスは /company/login にリダイレクトする", async () => {
    updateSessionMock.mockResolvedValue({
      user: null,
      supabaseResponse: nextResponseMock,
    });

    const { middleware } = await import("@/middleware");
    const { NextResponse } = await import("next/server");
    const request = buildRequest({ pathname: "/company/dashboard" });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await middleware(request as any);

    expect(NextResponse.redirect).toHaveBeenCalledOnce();
    const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    expect(String(redirectUrl)).toContain("/company/login");
    expect(String(redirectUrl)).toContain("next=%2Fcompany%2Fdashboard");
    expect(response).toHaveProperty("__redirectTo");
  });

  it("学生ロールで /company/* にアクセスすると /company/login にリダイレクト", async () => {
    updateSessionMock.mockResolvedValue({
      user: buildUser("student"),
      supabaseResponse: nextResponseMock,
    });

    const { middleware } = await import("@/middleware");
    const { NextResponse } = await import("next/server");
    const request = buildRequest({ pathname: "/company/dashboard" });

    await middleware(request as never);

    expect(NextResponse.redirect).toHaveBeenCalledOnce();
    const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    expect(String(redirectUrl)).toContain("/company/login");
  });

  it.each([["company_owner"], ["company_admin"], ["company_member"]])(
    "%s ロールで /company/* にアクセスすると通過する",
    async (role) => {
      updateSessionMock.mockResolvedValue({
        user: buildUser(role),
        supabaseResponse: nextResponseMock,
      });

      const { middleware } = await import("@/middleware");
      const { NextResponse } = await import("next/server");
      const request = buildRequest({ pathname: "/company/dashboard" });

      const response = await middleware(request as never);

      expect(NextResponse.redirect).not.toHaveBeenCalled();
      expect(response).toBe(nextResponseMock);
    },
  );

  it("ログイン済み企業ユーザーが /company/login に来たら /company/dashboard にリダイレクト", async () => {
    updateSessionMock.mockResolvedValue({
      user: buildUser("company_owner"),
      supabaseResponse: nextResponseMock,
    });

    const { middleware } = await import("@/middleware");
    const { NextResponse } = await import("next/server");
    const request = buildRequest({ pathname: "/company/login" });

    await middleware(request as never);

    expect(NextResponse.redirect).toHaveBeenCalledOnce();
    const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    expect(String(redirectUrl)).toContain("/company/dashboard");
  });

  it("未ログインで /company/login にアクセスする場合はリダイレクトせず通過", async () => {
    updateSessionMock.mockResolvedValue({
      user: null,
      supabaseResponse: nextResponseMock,
    });

    const { middleware } = await import("@/middleware");
    const { NextResponse } = await import("next/server");
    const request = buildRequest({ pathname: "/company/login" });

    const response = await middleware(request as never);

    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(response).toBe(nextResponseMock);
  });

  it("/company 以外のパスはガードしない", async () => {
    updateSessionMock.mockResolvedValue({
      user: null,
      supabaseResponse: nextResponseMock,
    });

    const { middleware } = await import("@/middleware");
    const { NextResponse } = await import("next/server");
    const request = buildRequest({ pathname: "/about" });

    const response = await middleware(request as never);

    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(response).toBe(nextResponseMock);
  });
});
