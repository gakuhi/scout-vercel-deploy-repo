import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ROUTES, STUDENT_ROUTES, USER_ROLES } from "@/shared/constants/auth";

/** 認証不要、またはページ内で独自に認証チェックするルート */
const PUBLIC_PREFIXES = [
  AUTH_ROUTES.LOGIN,
  AUTH_ROUTES.CALLBACK,
  "/api/auth/",
] as const;

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // --- パブリックルート ---
  if (isPublicRoute(pathname)) {
    // ログイン済みユーザーがログインページにアクセスした場合はダッシュボードへ
    if (user && pathname.startsWith(AUTH_ROUTES.LOGIN)) {
      return NextResponse.redirect(
        new URL(STUDENT_ROUTES.DASHBOARD, request.url),
      );
    }
    return supabaseResponse;
  }

  // --- 認証が必要なルート ---
  if (!user) {
    const loginUrl = new URL(AUTH_ROUTES.LOGIN, request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // --- ロールチェック: /student/* は student ロールのみ ---
  const role = user.app_metadata?.role;
  if (pathname.startsWith("/student") && role !== USER_ROLES.STUDENT) {
    return NextResponse.redirect(
      new URL(`${AUTH_ROUTES.LOGIN}?error=unauthorized`, request.url),
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 以下を除外:
     * - _next/static, _next/image (Next.js 内部)
     * - favicon.ico, 画像ファイル
     * - /monitoring (Sentry tunnel)
     */
    "/((?!_next/static|_next/image|favicon.ico|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
