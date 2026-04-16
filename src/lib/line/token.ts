import { jwtVerify } from "jose";
import { getLineConfig } from "./config";

/**
 * LINE ID token のペイロード
 * ref: https://developers.line.biz/ja/docs/line-login/verify-id-token/
 */
export interface LineIdTokenPayload {
  /** LINE ユーザーID */
  sub: string;
  /** 表示名 */
  name?: string;
  /** プロフィール画像URL */
  picture?: string;
  /** メールアドレス（email スコープ取得済み + ユーザーがLINEにメアド登録済みの場合のみ） */
  email?: string;
  /** 発行者 */
  iss: string;
  /** チャネルID */
  aud: string;
  /** 有効期限（Unix timestamp） */
  exp: number;
  /** 発行日時（Unix timestamp） */
  iat: number;
  /** nonce（直接ログイン時のみ使用） */
  nonce?: string;
}

/**
 * authorization code を access token / ID token に交換する
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  idToken: string;
}> {
  const config = getLineConfig();

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.callbackUrl,
    client_id: config.channelId,
    client_secret: config.channelSecret,
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LINE token exchange failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    idToken: data.id_token,
  };
}

/**
 * ID token を検証してペイロードを返す
 *
 * LINE の ID token は JWT (HS256) で署名されている。
 * jose ライブラリで署名・issuer・audience・有効期限を一括検証する。
 */
export async function verifyIdToken(
  idToken: string,
  nonce?: string,
): Promise<LineIdTokenPayload> {
  const config = getLineConfig();
  const secret = new TextEncoder().encode(config.channelSecret);

  const { payload } = await jwtVerify(idToken, secret, {
    algorithms: ["HS256"],
    issuer: "https://access.line.me",
    audience: config.channelId,
  });

  if (nonce && payload.nonce !== nonce) {
    throw new Error("LINE id_token の nonce が一致しません");
  }

  return payload as unknown as LineIdTokenPayload;
}
