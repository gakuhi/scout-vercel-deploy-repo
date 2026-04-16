import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * LINE Login の state パラメータに含める情報
 *
 * origin で経路を区別:
 *   - "direct": 学生がスカウトから直接ログイン
 *   - "smartes" 等: 外部プロダクトからの同時登録/後から連携
 */
export interface StatePayload {
  /** 経路識別子（"direct" or プロダクト識別子） */
  origin: string;
  /** プロダクト側のユーザーID（origin が "direct" の場合は undefined） */
  sourceUserId?: string;
  /** 登録完了後の戻り先URL（origin が "direct" の場合は undefined） */
  callbackUrl?: string;
  /** CSRFトークン */
  csrfToken: string;
  /** 有効期限（Unix timestamp） */
  expiresAt: number;
}

/**
 * state 暗号化・復号に使用するキー
 *
 * 必要な環境変数:
 *   SCOUT_STATE_ENCRYPTION_KEY — 32バイトの16進数文字列（64文字）
 */
function getEncryptionKey(): Buffer {
  const key = process.env.SCOUT_STATE_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("環境変数 SCOUT_STATE_ENCRYPTION_KEY が未設定です");
  }
  return Buffer.from(key, "hex");
}

/**
 * state ペイロードを暗号化して文字列にする
 * AES-256-GCM で暗号化
 */
export function encryptState(payload: StatePayload): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([
    cipher.update(json, "utf-8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // iv(12) + authTag(16) + encrypted を連結して base64url エンコード
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64url");
}

/**
 * 暗号化された state を復号してペイロードを返す
 */
export function decryptState(state: string): StatePayload {
  const key = getEncryptionKey();
  const combined = Buffer.from(state, "base64url");

  const iv = combined.subarray(0, 12);
  const authTag = combined.subarray(12, 28);
  const encrypted = combined.subarray(28);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  const payload: StatePayload = JSON.parse(decrypted.toString("utf-8"));

  // 有効期限検証
  const now = Math.floor(Date.now() / 1000);
  if (payload.expiresAt < now) {
    throw new Error("State has expired");
  }

  return payload;
}

/**
 * CSRFトークンを生成
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}
