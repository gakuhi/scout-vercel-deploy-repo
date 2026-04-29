import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  NotificationListItem,
  NotificationSettings,
} from "./schemas";

export async function getCompanyMembership(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_members")
    .select("company_id, role")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    companyId: data.company_id,
    role: (data.role as string) ?? "member",
  };
}

export async function listNotifications(
  userId: string,
): Promise<NotificationListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, title, body, type, is_read, read_at, reference_id, reference_type, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listNotifications error:", error);
    return [];
  }
  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    type: row.type as NotificationListItem["type"],
    isRead: row.is_read ?? false,
    readAt: row.read_at,
    referenceId: row.reference_id,
    referenceType: row.reference_type,
    createdAt: row.created_at,
  }));
}

export async function getNotificationSettings(
  userId: string,
): Promise<NotificationSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_notification_settings")
    .select("*")
    .eq("company_member_id", userId)
    .maybeSingle();

  return {
    scoutAccepted: data?.scout_accepted ?? true,
    chatMessage: data?.chat_message ?? true,
    eventReminder: data?.event_reminder ?? true,
    systemAnnouncement: data?.system_announcement ?? true,
  };
}
