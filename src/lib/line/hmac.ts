import { createHmac, timingSafeEqual } from "crypto";

/**
 * プロダクトごとの共有シークレット環境変数マッピング
 *
 * 必要な環境変数:
 *   SCOUT_HMAC_SECRET_SMARTES      — スマートES用
 *   SCOUT_HMAC_SECRET_INTERVIEWAI  — 面接練習AI用
 *   SCOUT_HMAC_SECRET_COMPAI       — 企業分析AI用
 *   SCOUT_HMAC_SECRET_SUGOSHU      — すごい就活用
 */
const SECRET_ENV_MAP: Record<string, string> = {
  smartes: "SCOUT_HMAC_SECRET_SMARTES",
  interviewai: "SCOUT_HMAC_SECRET_INTERVIEWAI",
  compai: "SCOUT_HMAC_SECRET_COMPAI",
  sugoshu: "SCOUT_HMAC_SECRET_SUGOSHU",
};

/**
 * プロダクト識別子から共有シークレットを取得
 */
function getSecretForSource(source: string): string {
  const envKey = SECRET_ENV_MAP[source];
  if (!envKey) {
    throw new Error(`Unknown source: ${source}`);
  }

  const secret = process.env[envKey];
  if (!secret) {
    throw new Error(`環境変数 ${envKey} が未設定です`);
  }

  return secret;
}

/**
 * HMAC-SHA256 署名を生成
 *
 * 署名対象: source + source_user_id + email + callback_url を連結
 * email を含めるのは、プロダクト側から渡される email の改ざん防止のため
 * （Supabase プロダクトでは auth.users を DB 直読みできず、email は URL パラメータ
 * 経由で受け取る設計。docs/development/08-product-side-tasks.md を参照）。
 */
export function generateHmacSignature(
  source: string,
  sourceUserId: string,
  email: string,
  callbackUrl: string,
  secret: string,
): string {
  const data = `${source}${sourceUserId}${email}${callbackUrl}`;
  return createHmac("sha256", secret).update(data).digest("hex");
}

/**
 * HMAC-SHA256 署名を検証
 *
 * タイミング攻撃を防ぐため timingSafeEqual を使用
 */
export function verifyHmacSignature(
  source: string,
  sourceUserId: string,
  email: string,
  callbackUrl: string,
  signature: string,
): boolean {
  const secret = getSecretForSource(source);
  const expected = generateHmacSignature(
    source,
    sourceUserId,
    email,
    callbackUrl,
    secret,
  );

  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(sigBuffer, expectedBuffer);
}
