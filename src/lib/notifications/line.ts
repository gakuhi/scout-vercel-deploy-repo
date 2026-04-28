/**
 * LINE メッセージ送信のスタブ。
 *
 * 本番では LINE Messaging API (Push Message) を呼び出して
 * 学生の LINE アカウントに通知を飛ばす想定だが、現時点では未実装。
 * 開発環境ではログのみ出力し、本番では no-op として返す。
 *
 * 呼び出し側（{@link deliverNotification}）は送信失敗を無視して
 * in-app 通知は継続する設計なので、ここでは throw しない。
 */
export async function sendLineScoutMessage(
  lineUid: string,
  message: string,
): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log(
      `[LINE mock] push to ${lineUid.slice(0, 8)}...: ${message.replace(/\n/g, " ").slice(0, 120)}`,
    );
  }
}
