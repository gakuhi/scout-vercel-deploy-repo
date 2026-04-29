"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCompanyMembership } from "./queries";

export type MarkReadState = {
  error?: string;
  success?: boolean;
};

export async function markNotificationReadAction(
  notificationId: string,
): Promise<MarkReadState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインし直してください" };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: now })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("markNotificationReadAction error:", error);
    return { error: "既読処理に失敗しました" };
  }

  revalidatePath("/company/notifications");
  return { success: true };
}

export async function markAllNotificationsReadAction(): Promise<MarkReadState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインし直してください" };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: now })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error("markAllNotificationsReadAction error:", error);
    return { error: "一括既読処理に失敗しました" };
  }

  revalidatePath("/company/notifications");
  return { success: true };
}

export type SaveSettingsState = {
  error?: string;
  success?: boolean;
};

export async function saveNotificationSettingsAction(
  _prev: SaveSettingsState,
  formData: FormData,
): Promise<SaveSettingsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインし直してください" };

  const membership = await getCompanyMembership(user.id);
  if (!membership) return { error: "企業情報が見つかりません" };

  const settings = {
    scout_accepted: formData.get("scoutAccepted") === "on",
    chat_message: formData.get("chatMessage") === "on",
    event_reminder: formData.get("eventReminder") === "on",
    system_announcement: formData.get("systemAnnouncement") === "on",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("company_notification_settings")
    .upsert(
      { company_member_id: user.id, ...settings },
      { onConflict: "company_member_id" },
    );

  if (error) {
    console.error("saveNotificationSettingsAction error:", error);
    return { error: "通知設定の保存に失敗しました" };
  }

  revalidatePath("/company/notifications/settings");
  return { success: true };
}
