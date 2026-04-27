"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { eventSchema } from "@/features/company/app/events/schemas";
import { getCompanyMembership } from "@/features/company/app/events/queries";

export type SaveEventState = {
  error?: string;
  success?: boolean;
  eventId?: string;
};

export async function createEventAction(
  _prev: SaveEventState,
  formData: FormData,
): Promise<SaveEventState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインし直してください" };

  const membership = await getCompanyMembership(user.id);
  if (!membership) return { error: "企業情報が見つかりません" };
  if (membership.role !== "owner" && membership.role !== "admin") {
    return { error: "イベントの作成は企業オーナーまたは管理者のみ実行できます" };
  }

  const isPublish = formData.get("action") === "publish";

  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    eventType: formData.get("eventType"),
    format: formData.get("format"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    location: formData.get("location"),
    onlineUrl: formData.get("onlineUrl"),
    description: formData.get("description"),
    capacity: formData.get("capacity"),
    applicationDeadline: formData.get("applicationDeadline"),
    targetGraduationYear: formData.get("targetGraduationYear"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("events")
    .insert({
      company_id: membership.companyId,
      created_by: user.id,
      organizer_type: "company" as const,
      title: parsed.data.title,
      event_type: parsed.data.eventType,
      format: parsed.data.format,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
      location: parsed.data.location,
      online_url: parsed.data.onlineUrl,
      description: parsed.data.description,
      capacity: parsed.data.capacity,
      application_deadline: parsed.data.applicationDeadline,
      target_graduation_year: parsed.data.targetGraduationYear,
      is_published: isPublish,
      published_at: isPublish ? now : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createEventAction insert error:", error);
    return { error: "イベントの作成に失敗しました" };
  }

  revalidatePath("/company/events");
  return { success: true, eventId: data.id };
}

export async function updateEventAction(
  _prev: SaveEventState,
  formData: FormData,
): Promise<SaveEventState> {
  const eventId = formData.get("eventId");
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof eventId !== "string" || !UUID_REGEX.test(eventId)) {
    return { error: "イベントIDが不正です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインし直してください" };

  const membership = await getCompanyMembership(user.id);
  if (!membership) return { error: "企業情報が見つかりません" };
  if (membership.role !== "owner" && membership.role !== "admin") {
    return { error: "イベントの編集は企業オーナーまたは管理者のみ実行できます" };
  }

  const isPublish = formData.get("action") === "publish";

  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    eventType: formData.get("eventType"),
    format: formData.get("format"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    location: formData.get("location"),
    onlineUrl: formData.get("onlineUrl"),
    description: formData.get("description"),
    capacity: formData.get("capacity"),
    applicationDeadline: formData.get("applicationDeadline"),
    targetGraduationYear: formData.get("targetGraduationYear"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const { data: existing } = await supabase
    .from("events")
    .select("id, published_at")
    .eq("id", eventId)
    .eq("company_id", membership.companyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) return { error: "イベントが見つかりません" };

  const now = new Date().toISOString();
  const publishedAt = isPublish
    ? existing.published_at ?? now
    : existing.published_at;

  const { error } = await supabase
    .from("events")
    .update({
      title: parsed.data.title,
      event_type: parsed.data.eventType,
      format: parsed.data.format,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
      location: parsed.data.location,
      online_url: parsed.data.onlineUrl,
      description: parsed.data.description,
      capacity: parsed.data.capacity,
      application_deadline: parsed.data.applicationDeadline,
      target_graduation_year: parsed.data.targetGraduationYear,
      is_published: isPublish,
      published_at: publishedAt,
      updated_at: now,
    })
    .eq("id", eventId)
    .eq("company_id", membership.companyId);

  if (error) {
    console.error("updateEventAction update error:", error);
    return { error: "イベントの更新に失敗しました" };
  }

  revalidatePath("/company/events");
  return { success: true, eventId };
}
