import { createAdminClient } from "@/lib/supabase/admin";
import { sendLineScoutMessage } from "./line";

export type DeliverNotificationType =
  | "scout_received"
  | "scout_accepted"
  | "scout_declined"
  | "chat_new_message"
  | "event_reminder"
  | "system_announcement";

export type DeliverNotificationParams = {
  /** 通知宛先の学生（= auth.users.id）。 */
  userId: string;
  type: DeliverNotificationType;
  title: string;
  body?: string;
  referenceType?: string;
  referenceId?: string;
};

/**
 * 通知配信の共通エントリポイント。
 *
 * - タイプ別トグル（`scout_received` / `chat_message` / `event_reminder` /
 *   `system_announcement`）は **LINE 配信の可否** のみを制御する。
 *   scout_* 系はすべて `scout_received` 設定に紐づく。
 * - アプリ内一覧（`notifications` テーブル）には **常に INSERT** する
 *   （タイプトグル OFF の通知もベルのバッジ件数に含まれる）。
 *
 * RLS 上 `notifications` への INSERT はクライアントからは不可なので
 * Service Role の admin client で書き込む。
 *
 * 想定呼び出し元:
 *   - 企業からスカウト送信完了時（scout_received）
 *   - scouts.status 変更時（scout_accepted / scout_declined）
 *   - chat_messages の INSERT 後（chat_new_message）
 *   - イベント開始前のリマインダー cron（event_reminder）
 *   - 運営のお知らせ（system_announcement）
 */
export async function deliverNotification(
  params: DeliverNotificationParams,
): Promise<void> {
  const supabase = createAdminClient();

  const { data: settings } = await supabase
    .from("student_notification_settings")
    .select(
      "scout_received, chat_message, event_reminder, system_announcement",
    )
    .eq("student_id", params.userId)
    .maybeSingle();

  // 行が無い場合は DB 定義のデフォルト（全 ON）として扱う。
  const typeEnabled = isTypeEnabled(params.type, settings);

  let lineSentAt: string | null = null;

  if (typeEnabled) {
    const { data: student } = await supabase
      .from("students")
      .select("line_uid")
      .eq("id", params.userId)
      .maybeSingle();
    if (student?.line_uid) {
      try {
        await sendLineScoutMessage(
          student.line_uid,
          `${params.title}${params.body ? `\n\n${params.body}` : ""}`,
        );
        lineSentAt = new Date().toISOString();
      } catch {
        // LINE 送信失敗でも in-app 通知は出す。
      }
    }
  }

  await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    reference_type: params.referenceType ?? null,
    reference_id: params.referenceId ?? null,
    line_sent_at: lineSentAt,
  });
}

type Settings = {
  scout_received: boolean | null;
  chat_message: boolean | null;
  event_reminder: boolean | null;
  system_announcement: boolean | null;
};

function isTypeEnabled(
  type: DeliverNotificationType,
  settings: Settings | null,
): boolean {
  if (!settings) return true;
  switch (type) {
    case "scout_received":
    case "scout_accepted":
    case "scout_declined":
      return settings.scout_received !== false;
    case "chat_new_message":
      return settings.chat_message !== false;
    case "event_reminder":
      return settings.event_reminder !== false;
    case "system_announcement":
      return settings.system_announcement !== false;
  }
}
