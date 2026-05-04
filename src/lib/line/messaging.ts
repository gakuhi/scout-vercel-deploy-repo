/**
 * LINE Messaging API クライアント
 *
 * 通知基盤から学生の LINE にプッシュメッセージを送信するための薄いラッパ。
 *
 * 必要な環境変数:
 *   LINE_MESSAGING_CHANNEL_ACCESS_TOKEN — LINE 公式アカウント（Messaging API）の
 *   長期チャネルアクセストークン。LINE Login のチャネルとは別物であることに注意。
 *
 * 参考: https://developers.line.biz/en/reference/messaging-api/#send-push-message
 */

const LINE_PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";

export type LineTextMessage = {
  type: "text";
  text: string;
};

/**
 * Flex Message。bubble の形は LINE 仕様（多階層）でかなり複雑なため、
 * 実装上は型を緩めに `unknown` で受け、構築側の責務で正しい構造を作る。
 * 参考: https://developers.line.biz/en/reference/messaging-api/#flex-message
 */
export type LineFlexMessage = {
  type: "flex";
  altText: string;
  contents: unknown;
};

export type LineMessage = LineTextMessage | LineFlexMessage;

function getAccessToken(): string {
  const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "LINE_MESSAGING_CHANNEL_ACCESS_TOKEN が設定されていません",
    );
  }
  return token;
}

/**
 * テキストメッセージを 1 件構築するヘルパ。
 * LINE のテキストメッセージは 5000 文字まで（安全のため 4900 で切る）。
 */
export function buildTextMessage(text: string): LineTextMessage {
  const MAX = 4900;
  const trimmed = text.length > MAX ? `${text.slice(0, MAX - 1)}…` : text;
  return { type: "text", text: trimmed };
}

/**
 * 指定した LINE user_id に対してプッシュメッセージを送信する。
 *
 * @param lineUserId — LINE user_id（auth.identities.identity_data->>'sub' で取得）
 * @param messages  — 送信するメッセージ配列（LINE 仕様上、1 リクエストあたり最大 5 件）
 *
 * エラー時は例外を投げる（呼び出し元で catch して line_sent_at を NULL のままにする）。
 */
export async function pushLineMessage(
  lineUserId: string,
  messages: LineMessage[],
): Promise<void> {
  if (messages.length === 0) {
    throw new Error("LINE push: messages が空です");
  }
  if (messages.length > 5) {
    throw new Error("LINE push: messages は最大 5 件まで");
  }

  const token = getAccessToken();

  const response = await fetch(LINE_PUSH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to: lineUserId, messages }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `LINE push failed: ${response.status} ${response.statusText} ${body}`,
    );
  }
}
