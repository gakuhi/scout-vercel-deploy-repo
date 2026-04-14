import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { exchangeCodeForTokens, verifyAndDecodeIdToken } from "@/features/auth/lib/line";
import { createOrSignInLineUser } from "@/features/auth/lib/session";
import { AUTH_ROUTES } from "@/shared/constants/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  // LINE 側でユーザーがキャンセルした場合
  if (errorParam) {
    return NextResponse.redirect(
      new URL(`${AUTH_ROUTES.LOGIN}?error=line_auth_failed`, siteUrl),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`${AUTH_ROUTES.LOGIN}?error=line_auth_failed`, siteUrl),
    );
  }

  try {
    // 1. CSRF 検証: Cookie に保存した state と一致するか確認
    const cookieStore = await cookies();
    const oauthStateCookie = cookieStore.get("line_oauth_state");
    if (!oauthStateCookie?.value) {
      throw new Error("OAuth state cookie が見つかりません");
    }

    const { state: savedState, nonce } = JSON.parse(
      oauthStateCookie.value,
    ) as { state: string; nonce: string };

    if (state !== savedState) {
      throw new Error("state が一致しません（CSRF の疑い）");
    }

    // Cookie をクリア
    cookieStore.delete("line_oauth_state");

    // 2. 認証コードをトークンに交換
    const tokens = await exchangeCodeForTokens(code);

    // 3. id_token を検証・デコード
    const linePayload = await verifyAndDecodeIdToken(tokens.id_token, nonce);

    // 4. メールアドレスを取得
    const email = linePayload.email;
    if (!email) {
      // LINE にメール未登録の場合
      // TODO: メール入力画面に誘導する（将来対応）
      return NextResponse.redirect(
        new URL(`${AUTH_ROUTES.LOGIN}?error=line_auth_failed`, siteUrl),
      );
    }

    // 5. Supabase ユーザーを作成/検索し、セッショントークンを取得
    const { hashedToken } = await createOrSignInLineUser(linePayload, email);

    // 6. Supabase verify endpoint にリダイレクトしてセッションを確立
    const verifyUrl = new URL(`${supabaseUrl}/auth/v1/verify`);
    verifyUrl.searchParams.set("token", hashedToken);
    verifyUrl.searchParams.set("type", "magiclink");
    verifyUrl.searchParams.set("redirect_to", `${siteUrl}/auth/callback`);

    return NextResponse.redirect(verifyUrl.toString());
  } catch (error) {
    console.error("LINE OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(`${AUTH_ROUTES.LOGIN}?error=line_auth_failed`, siteUrl),
    );
  }
}
