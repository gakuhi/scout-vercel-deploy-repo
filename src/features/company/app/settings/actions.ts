"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { companySettingsFormSchema } from "@/features/company/app/settings/schemas";
import { getCompanyMembership } from "@/features/company/shared/queries";
import { uploadFile, getPublicUrl, BUCKETS, validateFile } from "@/lib/storage";

export type SettingsActionState = {
  error?: string;
  success?: boolean;
};

async function requireOwnerOrAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const membership = await getCompanyMembership(user.id);
  if (!membership) return null;
  if (membership.role !== "owner" && membership.role !== "admin") {
    return { forbidden: true, user, companyId: membership.companyId, supabase };
  }
  return { forbidden: false, user, companyId: membership.companyId, supabase };
}

export async function updateCompanyAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const ctx = await requireOwnerOrAdmin();
  if (!ctx) return { error: "ログインし直してください" };
  if (ctx.forbidden)
    return { error: "この操作は企業オーナーまたは管理者のみ実行できます" };

  const parsed = companySettingsFormSchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry"),
    employeeCountRange: formData.get("employeeCountRange"),
    websiteUrl: formData.get("websiteUrl"),
    description: formData.get("description"),
    prefecture: formData.get("prefecture"),
    postalCode: formData.get("postalCode"),
    city: formData.get("city"),
    street: formData.get("street"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const { error } = await ctx.supabase
    .from("companies")
    .update({
      name: parsed.data.name,
      industry: parsed.data.industry ?? null,
      employee_count_range: parsed.data.employeeCountRange ?? null,
      website_url: parsed.data.websiteUrl ?? null,
      description: parsed.data.description ?? null,
      prefecture: parsed.data.prefecture ?? null,
      postal_code: parsed.data.postalCode ?? null,
      city: parsed.data.city ?? null,
      street: parsed.data.street ?? null,
      phone: parsed.data.phone ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.companyId);

  if (error) {
    return { error: `企業情報の更新に失敗しました: ${error.message}` };
  }

  revalidatePath("/company/settings");
  return { success: true };
}

export async function uploadLogoAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const ctx = await requireOwnerOrAdmin();
  if (!ctx) return { error: "ログインし直してください" };
  if (ctx.forbidden)
    return { error: "この操作は企業オーナーまたは管理者のみ実行できます" };

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "画像ファイルを選択してください" };
  }

  try {
    validateFile(file, BUCKETS["company-logos"]);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ファイルが不正です" };
  }

  const extByMime: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  const ext = extByMime[file.type] ?? "png";
  const path = `${ctx.companyId}/logo.${ext}`;

  try {
    await uploadFile(ctx.supabase, "company-logos", path, file, {
      upsert: true,
    });
  } catch (e) {
    return {
      error: `アップロードに失敗しました: ${e instanceof Error ? e.message : "不明なエラー"}`,
    };
  }

  const publicUrl = getPublicUrl(ctx.supabase, "company-logos", path);

  const { error } = await ctx.supabase
    .from("companies")
    .update({
      logo_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.companyId);

  if (error) {
    return { error: `企業情報の更新に失敗しました: ${error.message}` };
  }

  revalidatePath("/company/settings");
  return { success: true };
}

export async function removeLogoAction(): Promise<SettingsActionState> {
  const ctx = await requireOwnerOrAdmin();
  if (!ctx) return { error: "ログインし直してください" };
  if (ctx.forbidden)
    return { error: "この操作は企業オーナーまたは管理者のみ実行できます" };

  const { error } = await ctx.supabase
    .from("companies")
    .update({ logo_url: null, updated_at: new Date().toISOString() })
    .eq("id", ctx.companyId);

  if (error) return { error: error.message };

  revalidatePath("/company/settings");
  return { success: true };
}
