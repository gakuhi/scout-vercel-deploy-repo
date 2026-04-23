import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_ROUTES,
  STUDENT_ROUTES,
  USER_ROLES,
} from "@/shared/constants/auth";

/** 認証不要、またはページ内で独自に認証チェックするルート */
const PUBLIC_PREFIXES = [
  AUTH_ROUTES.STUDENT_LOGIN,
  AUTH_ROUTES.COMPANY_LOGIN,
  "/api/student/auth/",
  "/api/sync/",                 // CRON_SECRET で独自認証。Vercel Cron は Supabase session を持たないため public 扱いで通す必要がある
  "/company/forgot-password",   // ← 追加
  "/company/reset-password",    // ← 追加
  "/company/confirm",           // ← 追加
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
    if (user) {
      const role = user.app_metadata?.role;
      if (pathname.startsWith(AUTH_ROUTES.STUDENT_LOGIN) && role === USER_ROLES.STUDENT) {
        return NextResponse.redirect(
          new URL(STUDENT_ROUTES.DASHBOARD, request.url),
        );
      }
    }
    return supabaseResponse;
  }

  // --- 認証が必要なルート ---
  if (!user) {
    // アクセス先に応じて適切なログインページへリダイレクト
    const loginUrl = pathname.startsWith("/company")
      ? AUTH_ROUTES.COMPANY_LOGIN
      : AUTH_ROUTES.STUDENT_LOGIN;
    const redirectUrl = new URL(loginUrl, request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // --- ロールチェック ---
  const role = user.app_metadata?.role;

  if (pathname.startsWith("/student") && role !== USER_ROLES.STUDENT) {
    return NextResponse.redirect(
      new URL(`${AUTH_ROUTES.STUDENT_LOGIN}?error=unauthorized`, request.url),
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

