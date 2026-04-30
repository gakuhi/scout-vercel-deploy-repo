import type { Database } from "@/shared/types/database";

/**
 * 通知種別（DB enum と 1:1 対応）
 */
export type NotificationType =
  Database["public"]["Enums"]["notification_type"];

/**
 * 通知種別の日本語ラベル。メール件名・本文や UI 表示で使う。
 */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  scout_received: "スカウト受信",
  scout_accepted: "スカウト承諾",
  scout_declined: "スカウト辞退",
  chat_new_message: "チャット新着",
  event_reminder: "イベントリマインダー",
  system_announcement: "システムお知らせ",
};

/**
 * 受信者の種別。学生 / 企業担当者で参照する設定テーブルが異なるため分岐する。
 */
export type NotificationRecipientRole = "student" | "company_member";

export type StudentNotificationSettings =
  Database["public"]["Tables"]["student_notification_settings"]["Row"];

export type CompanyNotificationSettings =
  Database["public"]["Tables"]["company_notification_settings"]["Row"];

/**
 * notify() に渡す入力値。
 *
 * referenceType / referenceId は通知を開いたときの遷移先解決に使う
 * （例: reference_type = 'scouts', reference_id = <scout id>）。
 */
export type NotifyInput = {
  userId: string;
  recipientRole: NotificationRecipientRole;
  type: NotificationType;
  title: string;
  body?: string;
  referenceType?: string;
  referenceId?: string;
};

/**
 * notify() の結果。
 * - notificationId: アプリ内通知が保存された場合の通知ID
 * - lineSent: LINE 送信に成功したかどうか（学生のみ。未連携 / 設定 OFF / 送信失敗はすべて false）
 * - emailSent: メール送信に成功したかどうか（企業担当者のみ。アドレス未解決 / 設定 OFF / 送信失敗はすべて false）
 */
export type NotifyResult = {
  notificationId?: string;
  lineSent: boolean;
  emailSent: boolean;
};
