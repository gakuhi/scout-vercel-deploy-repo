import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  exchangeCodeForTokens,
  verifyAndDecodeIdToken,
} from "@/features/student/login/lib/line";
import { createOrSignInLineUser } from "@/features/student/login/lib/session";
import { AUTH_ROUTES, STUDENT_ROUTES } from "@/shared/constants/auth";
import type { Database } from "@/shared/types/database";

/**
 * GET /api/auth/callback/line
 *
 * 1. state Cookie 検証 (CSRF)
 * 2. 認可コード → トークン交換
 * 3. id_token 検証
 * 4. Supabase ユーザー検索 / 新規作成
 * 5. verifyOtp で Cookie ベースのセッション確立
 * 6. /student へリダイレクト
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const loginUrl = new URL(AUTH_ROUTES.LOGIN, request.url);

  if (errorParam || !code || !state) {
    loginUrl.searchParams.set("error", errorParam ?? "missing_params");
    return NextResponse.redirect(loginUrl);
  }

  try {
    // 1. CSRF 検証
    const oauthStateCookie = request.cookies.get("line_oauth_state");
    if (!oauthStateCookie?.value) {
      throw new Error("OAuth state cookie が見つかりません");
    }

    const { state: savedState, nonce } = JSON.parse(
      oauthStateCookie.value,
    ) as { state: string; nonce: string };

    if (state !== savedState) {
      throw new Error("state が一致しません（CSRF の疑い）");
    }

    // 2. 認証コードをトークンに交換
    const tokens = await exchangeCodeForTokens(code);

    // 3. id_token を検証・デコード
    const linePayload = await verifyAndDecodeIdToken(tokens.id_token, nonce);

    // 4. Supabase ユーザー作成/検索 + magic link トークン取得
    const { hashedToken } = await createOrSignInLineUser(linePayload);

    // 5. verifyOtp で Cookie ベースのセッション確立
    const redirectUrl = new URL(STUDENT_ROUTES.DASHBOARD, request.url);
    const response = NextResponse.redirect(redirectUrl);

    // state Cookie を削除
    response.cookies.delete("line_oauth_state");

    // Supabase SSR クライアント（Cookie を Response に書き込む）
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: hashedToken,
      type: "magiclink",
    });

    if (otpError) {
      throw new Error(`セッション確立に失敗しました: ${otpError.message}`);
    }

    return response;
  } catch (error) {
    console.error("[LINE callback]", error);
    loginUrl.searchParams.set("error", "line_auth_failed");
    return NextResponse.redirect(loginUrl);
  }
}
