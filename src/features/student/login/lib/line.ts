import { jwtVerify } from "jose";
import type { LineIdTokenPayload, LineTokenResponse } from "../types";

const LINE_AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";

function getLineEnv() {
  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const redirectUri = process.env.LINE_REDIRECT_URI;

  if (!channelId || !channelSecret || !redirectUri) {
    throw new Error(
      "LINE_CHANNEL_ID, LINE_CHANNEL_SECRET, LINE_REDIRECT_URI が設定されていません",
    );
  }

  return { channelId, channelSecret, redirectUri };
}

/**
 * LINE 認証 URL を生成する
 */
export function generateLineAuthUrl(state: string, nonce: string): string {
  const { channelId, redirectUri } = getLineEnv();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: redirectUri,
    state,
    nonce,
    scope: "profile openid email",
    bot_prompt: "normal",
  });

  return `${LINE_AUTH_URL}?${params.toString()}`;
}

/**
 * 認証コードをトークンに交換する
 */
export async function exchangeCodeForTokens(
  code: string,
): Promise<LineTokenResponse> {
  const { channelId, channelSecret, redirectUri } = getLineEnv();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: channelId,
    client_secret: channelSecret,
  });

  const res = await fetch(LINE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE token exchange failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<LineTokenResponse>;
}

/**
 * LINE id_token を検証・デコードする
 *
 * LINE は HS256 (channel secret を鍵として使用) で署名する。
 */
export async function verifyAndDecodeIdToken(
  idToken: string,
  nonce: string,
): Promise<LineIdTokenPayload> {
  const { channelId, channelSecret } = getLineEnv();

  const secret = new TextEncoder().encode(channelSecret);

  const { payload } = await jwtVerify(idToken, secret, {
    algorithms: ["HS256"],
    issuer: "https://access.line.me",
    audience: channelId,
  });

  if (payload.nonce !== nonce) {
    throw new Error("LINE id_token の nonce が一致しません");
  }

  return payload as unknown as LineIdTokenPayload;
}
