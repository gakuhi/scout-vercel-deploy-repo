import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const COMPANY_ROLES = new Set([
  "company_owner",
  "company_admin",
  "company_member",
]);

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const AUTH_PUBLIC_ROUTES = new Set([
    "/company/login",
    "/company/forgot-password",
    "/company/reset-password",
  ]);
  const isPublicAuthRoute = AUTH_PUBLIC_ROUTES.has(pathname);
  const isCompanyRoute = pathname.startsWith("/company") && !isPublicAuthRoute;

  if (isCompanyRoute) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/company/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const role = (user.app_metadata?.role ?? null) as string | null;
    if (!role || !COMPANY_ROLES.has(role)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/company/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === "/company/login" && user) {
    const role = (user.app_metadata?.role ?? null) as string | null;
    if (role && COMPANY_ROLES.has(role)) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/company/dashboard";
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
