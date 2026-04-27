"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCompanyMembership } from "@/features/company/app/events/queries";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(val: string): boolean {
  return UUID_REGEX.test(val);
}

export type TogglePublishState = {
  error?: string;
  success?: boolean;
};

export async function toggleEventPublishAction(
  eventId: string,
  publish: boolean,
): Promise<TogglePublishState> {
  if (!isValidUuid(eventId)) return { error: "無効なIDです" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインし直してください" };

  const membership = await getCompanyMembership(user.id);
  if (!membership) return { error: "企業情報が見つかりません" };
  if (membership.role !== "owner" && membership.role !== "admin") {
    return { error: "この操作は企業オーナーまたは管理者のみ実行できます" };
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
  const { error } = await supabase
    .from("events")
    .update({
      is_published: publish,
      published_at: publish ? existing.published_at ?? now : existing.published_at,
      updated_at: now,
    })
    .eq("id", eventId)
    .eq("company_id", membership.companyId);

  if (error) {
    console.error("toggleEventPublishAction error:", error);
    return { error: "更新に失敗しました" };
  }

  revalidatePath("/company/events");
  return { success: true };
}

export async function deleteEventAction(
  eventId: string,
): Promise<TogglePublishState> {
  if (!isValidUuid(eventId)) return { error: "無効なIDです" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインし直してください" };

  const membership = await getCompanyMembership(user.id);
  if (!membership) return { error: "企業情報が見つかりません" };
  if (membership.role !== "owner" && membership.role !== "admin") {
    return { error: "この操作は企業オーナーまたは管理者のみ実行できます" };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("events")
    .update({ deleted_at: now, is_published: false, updated_at: now })
    .eq("id", eventId)
    .eq("company_id", membership.companyId);

  if (error) {
    console.error("deleteEventAction error:", error);
    return { error: "削除に失敗しました" };
  }

  revalidatePath("/company/events");
  return { success: true };
}
