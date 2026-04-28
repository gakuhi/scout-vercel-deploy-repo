import { z } from "zod";

/** student_notification_settings の更新スキーマ。全項目は checkbox の "on" or undefined を boolean に変換して検証する。 */
export const notificationSettingsSchema = z.object({
  scout_received: z.boolean(),
  chat_message: z.boolean(),
  event_reminder: z.boolean(),
  system_announcement: z.boolean(),
});

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

export const NOTIFICATION_TYPES = [
  {
    key: "scout_received",
    label: "スカウト受信",
    description: "企業からスカウトが届いたときに LINE で通知します",
  },
  {
    key: "chat_message",
    label: "企業からの新着メッセージ",
    description: "新着メッセージを LINE で通知します",
  },
  {
    key: "event_reminder",
    label: "イベントリマインド",
    description: "参加予定イベントの開始前に LINE で通知します",
  },
  {
    key: "system_announcement",
    label: "システムからのお知らせ",
    description: "重要なアップデートやメンテナンス情報を LINE で通知します",
  },
] as const satisfies ReadonlyArray<{
  key: keyof NotificationSettings;
  label: string;
  description: string;
}>;

