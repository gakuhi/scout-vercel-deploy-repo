"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import {
  jobPostingDraftSchema,
  jobPostingSchema,
} from "@/features/company/app/jobs/schemas";
import { getCompanyMembership } from "@/features/company/app/jobs/queries";

export type SaveJobState = {
  error?: string;
  success?: boolean;
  jobId?: string;
};

export async function createJobAction(
  _prev: SaveJobState,
  formData: FormData,
): Promise<SaveJobState> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "ログインし直してください" };

  const membership = await getCompanyMembership(user.id);
  if (!membership) return { error: "企業情報が見つかりません" };
  if (membership.role !== "owner" && membership.role !== "admin") {
    return { error: "求人の作成は企業オーナーまたは管理者のみ実行できます" };
  }

  const isPublish = formData.get("action") === "publish";
  const schema = isPublish ? jobPostingSchema : jobPostingDraftSchema;

  const parsed = schema.safeParse({
    title: formData.get("title"),
    jobType: formData.get("jobType"),
    jobCategory: formData.get("jobCategory"),
    employmentType: formData.get("employmentType"),
    salaryRange: formData.get("salaryRange"),
    workLocation: formData.get("workLocation"),
    description: formData.get("description"),
    requirements: formData.get("requirements"),
    benefits: formData.get("benefits"),
    targetGraduationYears: formData.getAll("targetGraduationYears"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  // 画像アップロード（公開時のみ必須）
  const upload = await uploadHeroImage(supabase, formData, membership.companyId);
  if (upload.status !== "ok" && upload.status !== "none") {
    return { error: uploadErrorMessage(upload.status) };
  }
  if (isPublish && upload.status !== "ok") {
    return { error: uploadErrorMessage(upload.status) };
  }
  const heroImagePath = upload.status === "ok" ? upload.path : null;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("job_postings")
    .insert({
      company_id: membership.companyId,
      created_by: user.id,
      title: parsed.data.title,
      job_type: parsed.data.jobType,
      job_category: parsed.data.jobCategory,
      employment_type: parsed.data.employmentType,
      salary_range: parsed.data.salaryRange,
      work_location: parsed.data.workLocation,
      description: parsed.data.description,
      requirements: parsed.data.requirements,
      benefits: parsed.data.benefits,
      target_graduation_years: parsed.data.targetGraduationYears,
      hero_image_path: heroImagePath,
      is_published: isPublish,
      published_at: isPublish ? now : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createJobAction insert error:", error);
    return { error: "求人の作成に失敗しました" };
  }

  revalidatePath("/company/jobs");
  return { success: true, jobId: data.id };
}

export async function updateJobAction(
  _prev: SaveJobState,
  formData: FormData,
): Promise<SaveJobState> {
  const jobId = formData.get("jobId");
  if (typeof jobId !== "string" || !jobId) {
    return { error: "求人IDが不正です" };
  }

  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "ログインし直してください" };

  const membership = await getCompanyMembership(user.id);
  if (!membership) return { error: "企業情報が見つかりません" };
  if (membership.role !== "owner" && membership.role !== "admin") {
    return { error: "求人の編集は企業オーナーまたは管理者のみ実行できます" };
  }

  const isPublish = formData.get("action") === "publish";
  const schema = isPublish ? jobPostingSchema : jobPostingDraftSchema;

  const parsed = schema.safeParse({
    title: formData.get("title"),
    jobType: formData.get("jobType"),
    jobCategory: formData.get("jobCategory"),
    employmentType: formData.get("employmentType"),
    salaryRange: formData.get("salaryRange"),
    workLocation: formData.get("workLocation"),
    description: formData.get("description"),
    requirements: formData.get("requirements"),
    benefits: formData.get("benefits"),
    targetGraduationYears: formData.getAll("targetGraduationYears"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  // 既存の求人が自社のものか確認
  const { data: existing } = await supabase
    .from("job_postings")
    .select("id, is_published, published_at, hero_image_path")
    .eq("id", jobId)
    .eq("company_id", membership.companyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) {
    return { error: "求人が見つかりません" };
  }

  const now = new Date().toISOString();
  const publishedAt = isPublish
    ? existing.published_at ?? now
    : existing.published_at;

  // 画像アップロード（新しい画像がある場合のみ更新）
  const upload = await uploadHeroImage(supabase, formData, membership.companyId);
  if (upload.status !== "ok" && upload.status !== "none") {
    return { error: uploadErrorMessage(upload.status) };
  }
  const heroImagePath = upload.status === "ok" ? upload.path : null;
  const removeImage = formData.get("removeHeroImage") === "true";

  // 画像必須は公開時のみ。下書きでは既存画像を削除して保存することも許容する
  if (isPublish) {
    const willHaveImage =
      heroImagePath !== null || (!removeImage && !!existing.hero_image_path);
    if (!willHaveImage) {
      return { error: "トップ画像をアップロードしてください" };
    }
  }

  const { error } = await supabase
    .from("job_postings")
    .update({
      title: parsed.data.title,
      job_type: parsed.data.jobType,
      job_category: parsed.data.jobCategory,
      employment_type: parsed.data.employmentType,
      salary_range: parsed.data.salaryRange,
      work_location: parsed.data.workLocation,
      description: parsed.data.description,
      requirements: parsed.data.requirements,
      benefits: parsed.data.benefits,
      target_graduation_years: parsed.data.targetGraduationYears,
      ...(heroImagePath !== null
        ? { hero_image_path: heroImagePath }
        : !isPublish && removeImage
          ? { hero_image_path: null }
          : {}),
      is_published: isPublish,
      published_at: publishedAt,
      updated_at: now,
    })
    .eq("id", jobId)
    .eq("company_id", membership.companyId);

  if (error) {
    console.error("updateJobAction update error:", error);
    return { error: "求人の更新に失敗しました" };
  }

  revalidatePath("/company/jobs");
  return { success: true, jobId };
}

// --- 画像アップロードヘルパー ---

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const MAX_HERO_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
const ALLOWED_IMAGE_EXTS = ["jpg", "jpeg", "png", "webp"] as const;

type UploadHeroImageResult =
  | { status: "ok"; path: string }
  | { status: "none" }
  | { status: "too-large" }
  | { status: "invalid-type" }
  | { status: "upload-failed" };

async function uploadHeroImage(
  supabase: SupabaseClient,
  formData: FormData,
  companyId: string,
): Promise<UploadHeroImageResult> {
  const file = formData.get("heroImage") as File | null;
  if (!file || file.size === 0) return { status: "none" };
  if (file.size > MAX_HERO_IMAGE_BYTES) return { status: "too-large" };

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const mimeOk = (ALLOWED_IMAGE_MIME as readonly string[]).includes(file.type);
  const extOk = (ALLOWED_IMAGE_EXTS as readonly string[]).includes(ext);
  if (!mimeOk || !extOk) return { status: "invalid-type" };

  const path = `${companyId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("job-images")
    .upload(path, file, { contentType: file.type });

  if (error) {
    console.error("uploadHeroImage error:", error);
    return { status: "upload-failed" };
  }

  return { status: "ok", path };
}

function uploadErrorMessage(status: UploadHeroImageResult["status"]): string {
  switch (status) {
    case "too-large":
      return "画像サイズは10MB以内にしてください";
    case "invalid-type":
      return "画像は JPG / PNG / WebP 形式のみアップロードできます";
    case "upload-failed":
      return "画像のアップロードに失敗しました";
    default:
      return "トップ画像をアップロードしてください";
  }
}
