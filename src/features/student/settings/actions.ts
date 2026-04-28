"use server";

import { revalidatePath } from "next/cache";
import { deliverNotification } from "@/lib/notifications/deliver";
import { createClient } from "@/lib/supabase/server";
import {
  notificationSettingsSchema,
  type NotificationSettings,
} from "./schema";

export type SettingsActionState = {
  error?: string;
  success?: boolean;
};

const DEFAULT_SETTINGS: NotificationSettings = {
  scout_received: true,
  chat_message: true,
  event_reminder: true,
  system_announcement: true,
};

export type NotificationType =
  | "scout_received"
  | "scout_accepted"
  | "scout_declined"
  | "chat_new_message"
  | "event_reminder"
  | "system_announcement";

/** UI 上のカテゴリ。DB の notification_type を粗くグルーピングする。 */
export type NotificationCategory =
  | "scout"
  | "message"
  | "event"
  | "announcement";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
};

export type SettingsData = {
  notificationSettings: NotificationSettings;
  notifications: NotificationItem[];
};

const NOTIFICATIONS_LIMIT = 20;

function categorize(type: NotificationType): NotificationCategory {
  switch (type) {
    case "scout_received":
    case "scout_accepted":
    case "scout_declined":
      return "scout";
    case "chat_new_message":
      return "message";
    case "event_reminder":
      return "event";
    case "system_announcement":
      return "announcement";
  }
}

export async function getSettingsData(): Promise<SettingsData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [settingsRes, notifRes] = await Promise.all([
    supabase
      .from("student_notification_settings")
      .select(
        "scout_received, chat_message, event_reminder, system_announcement",
      )
      .eq("student_id", user.id)
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("id, type, title, body, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(NOTIFICATIONS_LIMIT),
  ]);

  const notificationSettings: NotificationSettings =
    settingsRes.data ?? DEFAULT_SETTINGS;

  const rows = (notifRes.data ?? []) as Array<{
    id: string;
    type: NotificationType;
    title: string;
    body: string | null;
    is_read: boolean;
    created_at: string;
  }>;

  const notifications: NotificationItem[] = rows.map((r) => ({
    id: r.id,
    type: r.type,
    category: categorize(r.type),
    title: r.title,
    body: r.body,
    isRead: r.is_read,
    createdAt: r.created_at,
  }));

  return { notificationSettings, notifications };
}

/** サイドバーのベル通知で表示フィルタに使う通知設定を取得する。 */
export async function getNotificationSettings(): Promise<NotificationSettings | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("student_notification_settings")
    .select(
      "scout_received, chat_message, event_reminder, system_announcement",
    )
    .eq("student_id", user.id)
    .maybeSingle();

  return data ?? DEFAULT_SETTINGS;
}

/** サイドバーのベル通知パネル用。通知のみを軽量に取得する。 */
export async function getNotifications(): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(NOTIFICATIONS_LIMIT);

  const rows = (data ?? []) as Array<{
    id: string;
    type: NotificationType;
    title: string;
    body: string | null;
    is_read: boolean;
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    category: categorize(r.type),
    title: r.title,
    body: r.body,
    isRead: r.is_read,
    createdAt: r.created_at,
  }));
}

function checkboxToBool(v: FormDataEntryValue | null): boolean {
  return v === "on" || v === "true";
}

export async function updateNotificationSettings(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証エラー。再度ログインしてください。" };
  }

  const parsed = notificationSettingsSchema.safeParse({
    scout_received: checkboxToBool(formData.get("scout_received")),
    chat_message: checkboxToBool(formData.get("chat_message")),
    event_reminder: checkboxToBool(formData.get("event_reminder")),
    system_announcement: checkboxToBool(formData.get("system_announcement")),
  });

  if (!parsed.success) {
    return { error: "入力内容を確認してください" };
  }

  const { error } = await supabase
    .from("student_notification_settings")
    .upsert(
      { student_id: user.id, ...parsed.data },
      { onConflict: "student_id" },
    );

  if (error) {
    return { error: "保存に失敗しました。もう一度お試しください。" };
  }

  revalidatePath("/student/settings");
  return { success: true };
}

/** 未読通知をすべて既読にする。 */
export async function markAllNotificationsAsRead(): Promise<SettingsActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証エラー。再度ログインしてください。" };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    return { error: "既読処理に失敗しました。" };
  }

  revalidatePath("/student/settings");
  return { success: true };
}

/**
 * 開発環境でのみ使用可能な、通知配信のテストアクション。
 * {@link deliverNotification} を現在ログイン中の学生向けに呼び出して
 * 通知設定の ON/OFF による挙動を手元で検証する。
 */
export async function sendTestNotification(): Promise<SettingsActionState> {
  if (process.env.NODE_ENV !== "development") {
    return { error: "テスト通知は開発環境のみ利用可能です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証エラー。再度ログインしてください。" };
  }

  await deliverNotification({
    userId: user.id,
    type: "system_announcement",
    title: "テスト通知",
    body: "通知設定の挙動を確認するためのテスト通知です。",
  });

  revalidatePath("/student/settings");
  return { success: true };
}
