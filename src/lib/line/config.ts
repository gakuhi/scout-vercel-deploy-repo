/**
 * LINE Login 設定
 *
 * 必要な環境変数:
 *   LINE_LOGIN_CHANNEL_ID       — LINE Login チャネルID
 *   LINE_LOGIN_CHANNEL_SECRET   — LINE Login チャネルシークレット
 *   NEXT_PUBLIC_BASE_URL        — スカウトサービスのベースURL（例: https://scout.example.com）
 */

export function getLineConfig() {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!channelId || !channelSecret || !baseUrl) {
    throw new Error(
      "LINE Login 環境変数が未設定です: LINE_LOGIN_CHANNEL_ID, LINE_LOGIN_CHANNEL_SECRET, NEXT_PUBLIC_BASE_URL",
    );
  }

  return {
    channelId,
    channelSecret,
    callbackUrl: `${baseUrl}/api/student/auth/callback/line`,
    authorizationUrl: "https://access.line.me/oauth2/v2.1/authorize",
    tokenUrl: "https://api.line.me/oauth2/v2.1/token",
  } as const;
}
