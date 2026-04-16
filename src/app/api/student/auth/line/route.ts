import { type NextRequest, NextResponse } from "next/server";
import { getLineConfig } from "@/lib/line/config";
import { verifyHmacSignature } from "@/lib/line/hmac";
import { encryptState, generateCsrfToken } from "@/lib/line/state";
import { registerQuerySchema } from "@/features/auth/schemas";

/**
 * GET /api/student/auth/line
 *
 * LINE Login OAuth フローを開始する統一エンドポイント。
 *
 * ■ 直接ログイン（パラメータなし）
 *   → state に origin: "direct" を詰めて LINE へリダイレクト
 *
 * ■ 同時登録 / 後から連携（source, source_user_id, callback_url, signature）
 *   → HMAC署名検証 → state に source 情報を詰めて LINE へリダイレクト
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const hasSource = searchParams.has("source");

  let origin: string;
  let sourceUserId: string | undefined;
  let callbackUrl: string | undefined;

  if (hasSource) {
    // --- 同時登録 / 後から連携 ---
    const parsed = registerQuerySchema.safeParse({
      source: searchParams.get("source"),
      source_user_id: searchParams.get("source_user_id"),
      callback_url: searchParams.get("callback_url"),
      signature: searchParams.get("signature"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { source, source_user_id, callback_url, signature } = parsed.data;

    // HMAC署名検証
    const isValid = verifyHmacSignature(
      source,
      source_user_id,
      callback_url,
      signature,
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 },
      );
    }

    origin = source;
    sourceUserId = source_user_id;
    callbackUrl = callback_url;
  } else {
    // --- 直接ログイン ---
    origin = "direct";
  }

  // state を生成（暗号化して LINE Login の state パラメータに渡す）
  const csrfToken = generateCsrfToken();
  const state = encryptState({
    origin,
    sourceUserId,
    callbackUrl,
    csrfToken,
    expiresAt: Math.floor(Date.now() / 1000) + 600, // 10分
  });

  // CSRF トークンを HttpOnly cookie に保存（callback で検証用）
  const response = NextResponse.redirect(buildLineAuthUrl(state));
  response.cookies.set("scout_csrf", csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10分
    path: "/api/student/auth/callback",
  });

  return response;
}

/**
 * LINE Login 認可URLを組み立てる
 */
function buildLineAuthUrl(state: string): string {
  const config = getLineConfig();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.channelId,
    redirect_uri: config.callbackUrl,
    state,
    scope: "profile openid email",
    bot_prompt: "aggressive",
  });

  return `${config.authorizationUrl}?${params.toString()}`;
}
