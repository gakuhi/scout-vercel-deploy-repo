import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { AUTH_ROUTES, STUDENT_ROUTES } from "@/shared/constants/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (!code) {
    return NextResponse.redirect(
      new URL(`${AUTH_ROUTES.LOGIN}?error=session_failed`, siteUrl),
    );
  }

  const redirectPath: string = STUDENT_ROUTES.DASHBOARD;

  // Cookie を操作するための response は最後に作成するため、まず Supabase client を構築
  const cookiesToSetLater: {
    name: string;
    value: string;
    options: Record<string, unknown>;
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSetLater.push(
            ...cookiesToSet.map(({ name, value, options }) => ({
              name,
              value,
              options: options as Record<string, unknown>,
            })),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Session exchange error:", error);
    return NextResponse.redirect(
      new URL(`${AUTH_ROUTES.LOGIN}?error=session_failed`, siteUrl),
    );
  }

  // 最終的なリダイレクト先で response を作成し、Cookie をセット
  const response = NextResponse.redirect(new URL(redirectPath, siteUrl));
  for (const { name, value, options } of cookiesToSetLater) {
    response.cookies.set(
      name,
      value,
      options as Parameters<typeof response.cookies.set>[2],
    );
  }

  return response;
}
