export const NOTIFICATION_TYPES = [
  "scout_received",
  "scout_accepted",
  "scout_declined",
  "chat_new_message",
  "event_reminder",
  "system_announcement",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  scout_received: "スカウト受信",
  scout_accepted: "スカウト承諾",
  scout_declined: "スカウト辞退",
  chat_new_message: "チャット新着",
  event_reminder: "イベントリマインダー",
  system_announcement: "システムお知らせ",
};

export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  scout_received: "mail",
  scout_accepted: "check_circle",
  scout_declined: "cancel",
  chat_new_message: "chat",
  event_reminder: "event",
  system_announcement: "campaign",
};

export type NotificationListItem = {
  id: string;
  title: string;
  body: string | null;
  type: NotificationType;
  isRead: boolean;
  readAt: string | null;
  referenceId: string | null;
  referenceType: string | null;
  createdAt: string | null;
};

export type NotificationSettings = {
  scoutAccepted: boolean;
  scoutDeclined: boolean;
  chatMessage: boolean;
  eventReminder: boolean;
  systemAnnouncement: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
};
