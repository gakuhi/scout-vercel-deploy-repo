"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProfileMock } from "@/features/student/profile/mock";
import { profileSchema } from "@/features/student/profile/schema";
import { buildFullName, buildInitials, checkboxToBool } from "@/features/student/profile/utils";

export type ProfileActionState = {
  error?: string;
};

export async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("students")
    .select("*, mbti_types(type_code, name_ja)")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;

  return {
    ...data,
    profile_image_url: await resolveProfileImageUrl(supabase, data.profile_image_url),
  };
}

export async function getMbtiTypes() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mbti_types")
    .select("id, type_code, name_ja")
    .order("type_code");

  return data ?? [];
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type ProductLink = { product: string; external_user_id: string };

const PROFILE_IMAGE_SIGNED_URL_TTL = 60 * 60; // 1 時間

/**
 * DB 上の profile_image_url を <img src> に使える URL へ解決する。
 * - 自バケットの path（例: "uid/avatar.jpg"）→ createSignedUrl で署名 URL 発行
 * - 外部 URL（LINE CDN 等）→ そのまま返す
 * - null → null
 */
async function resolveProfileImageUrl(
  supabase: SupabaseClient,
  raw: string | null,
): Promise<string | null> {
  if (!raw) return null;
  if (/^https?:\/\//.test(raw)) return raw;
  const { data } = await supabase.storage
    .from("profile-images")
    .createSignedUrl(raw, PROFILE_IMAGE_SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}

async function getProductCounts(
  supabase: SupabaseClient,
  links: ProductLink[],
) {
  const extId = (product: string) =>
    links.find((l) => l.product === product)?.external_user_id;

  const smartesId = extId("smartes");
  const compaiId = extId("compai");
  const interviewaiId = extId("interviewai");

  const [esRes, researchRes, interviewRes] = await Promise.all([
    smartesId
      ? supabase
          .from("synced_smartes_generated_es")
          .select("*", { count: "exact", head: true })
          .eq("external_user_id", smartesId)
      : Promise.resolve({ count: 0 }),
    compaiId
      ? supabase
          .from("synced_compai_researches")
          .select("*", { count: "exact", head: true })
          .eq("external_user_id", compaiId)
      : Promise.resolve({ count: 0 }),
    interviewaiId
      ? supabase
          .from("synced_interviewai_sessions")
          .select("*", { count: "exact", head: true })
          .eq("external_user_id", interviewaiId)
      : Promise.resolve({ count: 0 }),
  ]);

  return [
    { label: "ESデータ", icon: "description", value: esRes.count ?? 0 },
    { label: "企業分析", icon: "analytics", value: researchRes.count ?? 0 },
    { label: "面接練習", icon: "record_voice_over", value: interviewRes.count ?? 0 },
    { label: "活動一覧", icon: "format_list_bulleted", value: links.length },
  ];
}

export async function getProfileViewData(): Promise<ProfileMock | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // student_product_links から external_user_id を取得
  const [studentRes, integratedRes, linksRes] = await Promise.all([
    supabase
      .from("students")
      .select("*")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("student_integrated_profiles")
      .select("*")
      .eq("student_id", user.id)
      .maybeSingle(),
    supabase
      .from("student_product_links")
      .select("product, external_user_id")
      .eq("student_id", user.id),
  ]);

  const s = studentRes.data;
  if (!s) return null;

  const ip = integratedRes.data;

  const name = buildFullName(s.last_name, s.first_name);
  const initials = buildInitials(s.last_name, s.first_name);

  // Parse JSONB fields from integrated profile
  const strengths = Array.isArray(ip?.strengths)
    ? (ip.strengths as string[])
    : [];
  const skills = Array.isArray(ip?.skills) ? (ip.skills as string[]) : [];
  return {
    name,
    university: s.university ?? "未設定",
    faculty: s.faculty ?? "",
    graduationYear: s.graduation_year ?? 2027,
    avatarInitials: initials,
    profileImageUrl: await resolveProfileImageUrl(supabase, s.profile_image_url),
    bio: s.bio ?? "",
    integratedProfile: {
      summary: ip?.summary ?? "4プロダクトとの連携後にAI統合プロフィールが生成されます。",
      strengths,
      skills,
      // TODO: student_integrated_profiles に各スコアカラム
      // （growth_stability_score 等）を追加して参照する。現状は UI プレースホルダで
      // 統合プロフィールの存在有無のみで 50/null を返している。
      growthStabilityScore: ip ? 50 : null,
      specialistGeneralistScore: ip ? 50 : null,
      individualTeamScore: ip ? 50 : null,
      autonomyGuidanceScore: ip ? 50 : null,
      logicalThinkingScore: ip ? 50 : null,
      communicationScore: ip ? 50 : null,
      writingSkillScore: ip ? 50 : null,
      leadershipScore: ip ? 50 : null,
      activityVolumeScore: ip ? 0 : null,
      interestedIndustries: [],
      interestedJobTypes: [],
      scoreConfidence: 0,
    },
    productCounts: await getProductCounts(supabase, linksRes.data ?? []),
    scoutSettings: [],
    verifiedAt: "",
  };
}

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_AVATAR_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * formData.get("avatar") で渡された File を profile-images バケットへアップロードし、
 * ストレージ path を返す。アップロード不要（File 無し / size 0）なら null を返す。
 * path はサーバー側でのみ生成されるため、クライアントからの偽装は不可能。
 * バケットは Private なので、閲覧時は createSignedUrl で署名 URL を発行する。
 */
async function uploadAvatarFromFormData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  avatar: FormDataEntryValue | null,
): Promise<{ path: string | null; error?: string }> {
  if (!(avatar instanceof File) || avatar.size === 0) {
    return { path: null };
  }
  if (avatar.size > MAX_AVATAR_SIZE) {
    return { path: null, error: "画像サイズは 5MB 以下にしてください" };
  }
  if (!ALLOWED_AVATAR_MIME.has(avatar.type)) {
    return { path: null, error: "JPEG / PNG / WebP / GIF のみ対応しています" };
  }
  const ext = avatar.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("profile-images")
    .upload(path, avatar, { upsert: true, contentType: avatar.type });
  if (upErr) {
    return { path: null, error: "画像のアップロードに失敗しました" };
  }
  return { path };
}

export async function updateProfile(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証エラー。再度ログインしてください。" };
  }

  const raw = {
    last_name: formData.get("last_name"),
    first_name: formData.get("first_name"),
    last_name_kana: formData.get("last_name_kana"),
    first_name_kana: formData.get("first_name_kana"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    birthdate: formData.get("birthdate"),
    gender: formData.get("gender"),
    university: formData.get("university"),
    faculty: formData.get("faculty"),
    department: formData.get("department"),
    academic_type: formData.get("academic_type"),
    graduation_year: formData.get("graduation_year"),
    postal_code: formData.get("postal_code"),
    prefecture: formData.get("prefecture"),
    city: formData.get("city"),
    street: formData.get("street"),
    building: formData.get("building") || undefined,
    mbti_type_code: formData.get("mbti") || undefined,
    bio: formData.get("bio"),
    is_profile_public: checkboxToBool(formData.get("is_profile_public")),
  };

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  // アップロード（新規ファイルがあった時のみ）
  const uploaded = await uploadAvatarFromFormData(
    supabase,
    user.id,
    formData.get("avatar"),
  );
  if (uploaded.error) {
    return { error: uploaded.error };
  }

  // Resolve mbti_type_id from type_code
  let mbtiTypeId: string | null = null;
  if (parsed.data.mbti_type_code) {
    const { data: mbti } = await supabase
      .from("mbti_types")
      .select("id")
      .eq("type_code", parsed.data.mbti_type_code)
      .maybeSingle();
    mbtiTypeId = mbti?.id ?? null;
  }

  // profile_image_url は新規アップロード時のみ上書き。未変更なら既存値を保持する。
  const updatePayload: Record<string, unknown> = {
    last_name: parsed.data.last_name,
    first_name: parsed.data.first_name,
    last_name_kana: parsed.data.last_name_kana,
    first_name_kana: parsed.data.first_name_kana,
    email: parsed.data.email,
    phone: parsed.data.phone,
    birthdate: parsed.data.birthdate,
    gender: parsed.data.gender,
    university: parsed.data.university,
    faculty: parsed.data.faculty,
    department: parsed.data.department,
    academic_type: parsed.data.academic_type,
    graduation_year: parsed.data.graduation_year,
    postal_code: parsed.data.postal_code,
    prefecture: parsed.data.prefecture,
    city: parsed.data.city,
    street: parsed.data.street,
    building: parsed.data.building ?? null,
    mbti_type_id: mbtiTypeId,
    bio: parsed.data.bio,
    is_profile_public: parsed.data.is_profile_public ?? false,
  };
  if (uploaded.path) {
    updatePayload.profile_image_url = uploaded.path;
  }

  const { error } = await supabase
    .from("students")
    .update(updatePayload)
    .eq("id", user.id);

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[updateProfile] supabase error:", error);
    // Postgres の UNIQUE 制約違反（メールアドレス重複）
    if (error.code === "23505") {
      return { error: "このメールアドレスは既に使用されています" };
    }
    return { error: "保存に失敗しました。もう一度お試しください。" };
  }

  // 保存直後にキャッシュを明示的に無効化しておく（force-dynamic の保険）。
  revalidatePath("/student/profile");
  revalidatePath("/student/profile/edit");

  redirect("/student/profile?saved=1");
}
