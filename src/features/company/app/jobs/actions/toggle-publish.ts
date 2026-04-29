"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { jobPostingSchema } from "@/features/company/app/jobs/schemas";
import { getCompanyMembership } from "@/features/company/app/jobs/queries";

export type TogglePublishState = {
  error?: string;
  success?: boolean;
};

export async function togglePublishAction(
  jobId: string,
  publish: boolean,
): Promise<TogglePublishState> {
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
    .from("job_postings")
    .select(
      "id, published_at, title, job_type, job_category, employment_type, salary_range, work_location, description, requirements, benefits, target_graduation_years, hero_image_path",
    )
    .eq("id", jobId)
    .eq("company_id", membership.companyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) return { error: "求人が見つかりません" };

  // 公開時は必須項目を満たしているか検証する（不完全な下書きの公開を防ぐ）
  if (publish) {
    const validation = jobPostingSchema.safeParse({
      title: existing.title,
      jobType: existing.job_type,
      jobCategory: existing.job_category,
      employmentType: existing.employment_type,
      salaryRange: existing.salary_range,
      workLocation: existing.work_location,
      description: existing.description,
      requirements: existing.requirements,
      benefits: existing.benefits,
      targetGraduationYears: existing.target_graduation_years,
    });
    if (!validation.success) {
      return {
        error:
          "未入力の必須項目があるため公開できません。編集ページから内容を完成させてください",
      };
    }
    if (!existing.hero_image_path) {
      return {
        error:
          "トップ画像が未設定のため公開できません。編集ページから画像を設定してください",
      };
    }
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("job_postings")
    .update({
      is_published: publish,
      published_at: publish ? existing.published_at ?? now : existing.published_at,
      updated_at: now,
    })
    .eq("id", jobId)
    .eq("company_id", membership.companyId);

  if (error) {
    console.error("togglePublishAction update error:", error);
    return { error: "更新に失敗しました" };
  }

  revalidatePath("/company/jobs");
  return { success: true };
}

export async function deleteJobAction(
  jobId: string,
): Promise<TogglePublishState> {
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
    .from("job_postings")
    .update({ deleted_at: now, is_published: false, updated_at: now })
    .eq("id", jobId)
    .eq("company_id", membership.companyId);

  if (error) {
    console.error("deleteJobAction update error:", error);
    return { error: "削除に失敗しました" };
  }

  revalidatePath("/company/jobs");
  return { success: true };
}
