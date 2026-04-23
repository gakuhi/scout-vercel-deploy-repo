import { type NextRequest, NextResponse } from "next/server";
import { getLineConfig } from "@/lib/line/config";
import { verifyHmacSignature } from "@/lib/line/hmac";
import {
  encryptState,
  generateCsrfToken,
  type StatePayload,
} from "@/lib/line/state";
import { registerParamsSchema } from "@/features/auth/schemas";

/**
 * /api/student/auth/line
 *
 * LINE Login OAuth フローを開始する。経路別エンドポイント:
 *
 * - GET:  直接ログイン（パラメータなし）。origin: "direct" で LINE へリダイレクト
 * - POST: プロダクトからの同時登録 / 後から連携。source 等を form body で受け取る
 *
 * email などの PII を URL クエリに載せないため、プロダクト連携を POST に分離している。
 * GET に `source` 付きで来たリクエストは旧仕様なので 405 で弾く（早期検知）。
 */
export async function GET(request: NextRequest) {
  if (new URL(request.url).searchParams.has("source")) {
    return NextResponse.json(
      {
        error:
          "Product-linked registration must use POST with form body. See docs/development/08-product-side-tasks.md",
      },
      // RFC 7231 §6.5.5: 405 レスポンスは Allow ヘッダで許可メソッドを示す
      { status: 405, headers: { Allow: "POST" } },
    );
  }

  return buildRedirectToLine({
    origin: "direct",
    csrfToken: generateCsrfToken(),
    expiresAt: expirySeconds(),
  });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { error: "request body must be form-encoded" },
      { status: 400 },
    );
  }

  const parsed = registerParamsSchema.safeParse({
    source: formData.get("source"),
    source_user_id: formData.get("source_user_id"),
    email: formData.get("email"),
    callback_url: formData.get("callback_url"),
    signature: formData.get("signature"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const {
    source,
    source_user_id,
    email: emailParam,
    callback_url,
    signature,
  } = parsed.data;

  // email は未指定 / 空文字 / 有効 email のいずれか。
  // HMAC 検証では空文字として連結する契約（プロダクト側も同様に空文字で署名する）。
  const emailForHmac = emailParam ?? "";

  const isValid = verifyHmacSignature(
    source,
    source_user_id,
    emailForHmac,
    callback_url,
    signature,
  );

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  return buildRedirectToLine({
    origin: source,
    sourceUserId: source_user_id,
    // state には空文字ではなく undefined を格納する。callback 側の
    // `state.email ?? lineUser.email` が LINE の email にフォールバックできるようにするため。
    email: emailForHmac.length > 0 ? emailForHmac : undefined,
    callbackUrl: callback_url,
    csrfToken: generateCsrfToken(),
    expiresAt: expirySeconds(),
  });
}

function expirySeconds(): number {
  return Math.floor(Date.now() / 1000) + 600; // 10 分
}

/**
 * state を暗号化して LINE 認可 URL にリダイレクトする共通ビルダー。
 * CSRF トークンを HttpOnly cookie にセット（callback で検証）。
 *
 * status = 303 (See Other) を明示:
 *   NextResponse.redirect のデフォルトは 307 だが、307 はメソッドを保存するため
 *   POST からの redirect だとブラウザが LINE authorize に POST してしまい LINE が 405 を返す。
 *   PRG パターン準拠で 303 を使い、redirect 先は必ず GET で叩かれるようにする。
 *   GET → 303 → GET も問題なく動く。
 */
function buildRedirectToLine(payload: StatePayload): NextResponse {
  const state = encryptState(payload);
  const response = NextResponse.redirect(buildLineAuthUrl(state), {
    status: 303,
  });
  response.cookies.set("scout_csrf", payload.csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 分
    path: "/api/student/auth/callback",
  });
  return response;
}

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
