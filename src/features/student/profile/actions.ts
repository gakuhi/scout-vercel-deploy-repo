"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { industrySchema, type IndustryCategory } from "@/shared/constants/industries";
import { jobCategorySchema, type JobCategory } from "@/shared/constants/job-categories";
import type {
  SyncedEsItem,
  SyncedInterviewItem,
  SyncedItems,
  SyncedResearchItem,
  SyncedSugoshuItem,
  ActivityLevel,
  ProfileMock,
} from "@/features/student/profile/mock";
import { profileSchema } from "@/features/student/profile/schema";
import { buildFullName, buildInitials, checkboxToBool } from "@/features/student/profile/utils";
import { BUCKETS, uploadFile, validateFile } from "@/lib/storage";

const SYNCED_LIMIT = 5;

export type ProfileActionState = {
  error?: string;
};

// activity_volume_score (0-100) から UI 表示用の 3 段階 enum を導出する
function deriveActivityLevel(score: number | null): ActivityLevel | null {
  if (score == null) return null;
  if (score <= 30) return "low";
  if (score <= 60) return "medium";
  return "high";
}

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
      : Promise.resolve({ count: 0, error: null }),
    compaiId
      ? supabase
        .from("synced_compai_researches")
        .select("*", { count: "exact", head: true })
        .eq("external_user_id", compaiId)
      : Promise.resolve({ count: 0, error: null }),
    interviewaiId
      ? supabase
        .from("synced_interviewai_sessions")
        .select("*", { count: "exact", head: true })
        .eq("external_user_id", interviewaiId)
      : Promise.resolve({ count: 0, error: null }),
  ]);

  const sugoshuId = extId("sugoshu");
  const [resumeCountRes, diagnosisCountRes] = await Promise.all([
    sugoshuId
      ? supabase
        .from("synced_sugoshu_resumes")
        .select("*", { count: "exact", head: true })
        .eq("external_user_id", sugoshuId)
      : Promise.resolve({ count: 0, error: null }),
    sugoshuId
      ? supabase
        .from("synced_sugoshu_diagnoses")
        .select("*", { count: "exact", head: true })
        .eq("external_user_id", sugoshuId)
      : Promise.resolve({ count: 0, error: null }),
  ]);

  // 「同期済みだが 0 件」と「DB エラーで取得失敗」を区別できるよう error をログに残す。
  // count は null になり得るのでフォールバックは従来通り 0。
  for (const [label, res] of [
    ["smartes", esRes],
    ["compai", researchRes],
    ["interviewai", interviewRes],
    ["sugoshu_resumes", resumeCountRes],
    ["sugoshu_diagnoses", diagnosisCountRes],
  ] as const) {
    if (res.error) {
      console.error(`[getProductCounts] ${label} count error:`, res.error);
    }
  }

  const sugoshuCount = (resumeCountRes.count ?? 0) + (diagnosisCountRes.count ?? 0);

  return [
    { label: "ESデータ", icon: "description", value: esRes.count ?? 0 },
    { label: "企業分析", icon: "analytics", value: researchRes.count ?? 0 },
    { label: "面接練習", icon: "record_voice_over", value: interviewRes.count ?? 0 },
    { label: "すごい就活", icon: "description", value: sugoshuCount },
  ];
}

type EsRow = { id: string; generated_text: string | null; generated_at: string | null };
type ResearchRow = {
  id: string;
  title: string | null;
  url: string | null;
  original_created_at: string | null;
};
type InterviewRow = {
  id: string;
  company_name: string | null;
  session_type: string | null;
  overall_score: number | null;
  started_at: string | null;
};
type SugoshuResumeRow = {
  id: string;
  content: string | null;
  original_created_at: string | null;
};
type SugoshuDiagnosisRow = {
  id: string;
  diagnosis_data: unknown;
  original_created_at: string | null;
};

async function getSyncedItems(
  supabase: SupabaseClient,
  links: ProductLink[],
): Promise<SyncedItems> {
  const extId = (product: string) =>
    links.find((l) => l.product === product)?.external_user_id;

  const smartesId = extId("smartes");
  const compaiId = extId("compai");
  const interviewaiId = extId("interviewai");
  const sugoshuId = extId("sugoshu");

  const [esRes, researchRes, interviewRes, resumeRes, diagnosisRes] = await Promise.all([
    smartesId
      ? supabase
        .from("synced_smartes_generated_es")
        .select("id, generated_text, generated_at")
        .eq("external_user_id", smartesId)
        .order("generated_at", { ascending: false })
        .limit(SYNCED_LIMIT)
      : Promise.resolve({ data: [] as EsRow[] }),
    compaiId
      ? supabase
        .from("synced_compai_researches")
        .select("id, title, url, original_created_at")
        .eq("external_user_id", compaiId)
        .order("original_created_at", { ascending: false })
        .limit(SYNCED_LIMIT)
      : Promise.resolve({ data: [] as ResearchRow[] }),
    interviewaiId
      ? supabase
        .from("synced_interviewai_sessions")
        .select("id, company_name, session_type, overall_score, started_at")
        .eq("external_user_id", interviewaiId)
        .order("started_at", { ascending: false })
        .limit(SYNCED_LIMIT)
      : Promise.resolve({ data: [] as InterviewRow[] }),
    sugoshuId
      ? supabase
        .from("synced_sugoshu_resumes")
        .select("id, content, original_created_at")
        .eq("external_user_id", sugoshuId)
        .order("original_created_at", { ascending: false })
        .limit(SYNCED_LIMIT)
      : Promise.resolve({ data: [] as SugoshuResumeRow[] }),
    sugoshuId
      ? supabase
        .from("synced_sugoshu_diagnoses")
        .select("id, diagnosis_data, original_created_at")
        .eq("external_user_id", sugoshuId)
        .order("original_created_at", { ascending: false })
        .limit(SYNCED_LIMIT)
      : Promise.resolve({ data: [] as SugoshuDiagnosisRow[] }),
  ]);

  const es: SyncedEsItem[] = ((esRes.data ?? []) as EsRow[]).map((r) => ({
    id: r.id,
    generatedText: r.generated_text,
    generatedAt: r.generated_at,
  }));

  const researches: SyncedResearchItem[] = ((researchRes.data ?? []) as ResearchRow[]).map(
    (r) => ({
      id: r.id,
      title: r.title,
      url: r.url,
      originalCreatedAt: r.original_created_at,
    }),
  );

  const interviewSessions: SyncedInterviewItem[] = (
    (interviewRes.data ?? []) as InterviewRow[]
  ).map((r) => ({
    id: r.id,
    companyName: r.company_name,
    sessionType: r.session_type,
    overallScore: r.overall_score,
    startedAt: r.started_at,
  }));

  const resumes: SyncedSugoshuItem[] = ((resumeRes.data ?? []) as SugoshuResumeRow[]).map(
    (r) => ({
      id: r.id,
      kind: "resume" as const,
      contentPreview: r.content ? r.content.slice(0, 120) : null,
      originalCreatedAt: r.original_created_at,
    }),
  );

  const diagnoses: SyncedSugoshuItem[] = (
    (diagnosisRes.data ?? []) as SugoshuDiagnosisRow[]
  ).map((r) => ({
    id: r.id,
    kind: "diagnosis" as const,
    contentPreview: r.diagnosis_data
      ? JSON.stringify(r.diagnosis_data).slice(0, 120)
      : null,
    originalCreatedAt: r.original_created_at,
  }));

  const sugoshu = [...resumes, ...diagnoses]
    .sort((a, b) => (b.originalCreatedAt ?? "").localeCompare(a.originalCreatedAt ?? ""))
    .slice(0, SYNCED_LIMIT);

  return { es, researches, interviewSessions, sugoshu };
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
      .select("*, mbti_types(type_code, name_ja)")
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

  // 興味タグは DB 上 TEXT[] で語彙制約なし（設計書 03-02 / migration 20260421000000 参照）。
  // 許容値外（例: 旧 Claude プロンプトが生成した未定義タグ）はラベル解決で undefined になるため、
  // 読込時に zod schema で filter して落とす。
  const interestedIndustries = (ip?.interested_industries ?? []).filter(
    (v: string): v is IndustryCategory => industrySchema.safeParse(v).success,
  );
  const interestedJobTypes = (ip?.interested_job_types ?? []).filter(
    (v: string): v is JobCategory => jobCategorySchema.safeParse(v).success,
  );

  // UI の ActivityLevel（low/medium/high）は activity_volume_score から導出する
  const activityLevel: ActivityLevel | null = deriveActivityLevel(
    ip?.activity_volume_score ?? null,
  );

  // Supabase の型推論で結合結果が単体 / 配列のどちらにもなり得るため両対応
  type MbtiJoinRow = { type_code?: string | null; name_ja?: string | null };
  const mbtiJoin = (
    s as { mbti_types?: MbtiJoinRow | MbtiJoinRow[] | null }
  ).mbti_types;
  const mbtiRow: MbtiJoinRow | null = Array.isArray(mbtiJoin)
    ? (mbtiJoin[0] ?? null)
    : (mbtiJoin ?? null);
  const mbtiTypeCode = mbtiRow?.type_code ?? null;
  const mbtiTypeName = mbtiRow?.name_ja ?? null;

  return {
    name,
    university: s.university ?? "未設定",
    faculty: s.faculty ?? "",
    department: s.department ?? "",
    prefecture: s.prefecture ?? "",
    graduationYear: s.graduation_year ?? null,
    avatarInitials: initials,
    profileImageUrl: await resolveProfileImageUrl(supabase, s.profile_image_url),
    email: s.email ?? "",
    phone: s.phone ?? "",
    isProfilePublic: s.is_profile_public ?? false,
    mbtiTypeCode,
    mbtiTypeName,
    bio: s.bio ?? "",
    integratedProfile: {
      summary: ip?.summary ?? "4プロダクトとの連携後にAI統合プロフィールが生成されます。",
      strengths,
      skills,
      growthStabilityScore: ip?.growth_stability_score ?? null,
      specialistGeneralistScore: ip?.specialist_generalist_score ?? null,
      individualTeamScore: ip?.individual_team_score ?? null,
      autonomyGuidanceScore: ip?.autonomy_guidance_score ?? null,
      logicalThinkingScore: ip?.logical_thinking_score ?? null,
      communicationScore: ip?.communication_score ?? null,
      writingSkillScore: ip?.writing_skill_score ?? null,
      leadershipScore: ip?.leadership_score ?? null,
      activityVolumeScore: ip?.activity_volume_score ?? null,
      activityLevel,
      interestedIndustries,
      interestedJobTypes,
      scoreConfidence: ip?.score_confidence ?? null,
    },
    productCounts: await getProductCounts(supabase, linksRes.data ?? []),
    syncedItems: await getSyncedItems(supabase, linksRes.data ?? []),
    scoutSettings: [],
    verifiedAt: "",
  };
}

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

  try {
    validateFile(avatar, BUCKETS["profile-images"]);
  } catch (e) {
    return {
      path: null,
      error: e instanceof Error ? e.message : "ファイルが不正です",
    };
  }

  const ext = avatar.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar.${ext}`;

  try {
    await uploadFile(supabase, "profile-images", path, avatar, {
      upsert: true,
    });
  } catch (e) {
    return {
      path: null,
      error: `画像のアップロードに失敗しました: ${e instanceof Error ? e.message : "不明なエラー"}`,
    };
  }

  return { path };
}

/**
 * create / update のサーバアクションが共通でやる処理を吸収するヘルパ。
 * - 認証チェック → FormData パース → schema 検証 → 画像アップロード → MBTI 解決 → students UPDATE
 * 失敗時は ProfileActionState を返す。成功時は null を返し、呼び出し側が
 * revalidate / redirect を行う（redirect は throw する仕様なので helper 内では行わない）。
 */
async function persistStudentProfile(
  formData: FormData,
  logContext: string,
): Promise<ProfileActionState | null> {
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
    // formData.get は未設定キーで null を返すが schema は z.string().optional()
    // (null 不可) なので、空値は undefined に倒して任意項目として通す。
    bio: formData.get("bio") || undefined,
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

  // .select() を付けないと「RLS で 0 件更新だがエラーは返らない」状態を検知できない。
  // 0 件は明示的なエラーとして扱う。
  const { data, error } = await supabase
    .from("students")
    .update(updatePayload)
    .eq("id", user.id)
    .select("id");

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`[${logContext}] supabase error:`, error);
    // Postgres の UNIQUE 制約違反（メールアドレス重複）
    if (error.code === "23505") {
      return { error: "このメールアドレスは既に使用されています" };
    }
    return { error: "保存に失敗しました。もう一度お試しください。" };
  }

  if (!data || data.length === 0) {
    // eslint-disable-next-line no-console
    console.error(
      `[${logContext}] update affected 0 rows (auth.uid=${user.id}). RLS or session mismatch.`,
    );
    return {
      error:
        "保存に失敗しました。再度ログインし直してからもう一度お試しください。",
    };
  }

  return null;
}

export async function updateProfile(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const failure = await persistStudentProfile(formData, "updateProfile");
  if (failure) return failure;

  // 保存直後にキャッシュを明示的に無効化しておく（force-dynamic の保険）。
  revalidatePath("/student/profile");
  revalidatePath("/student/profile/edit");

  redirect("/student/profile?saved=1");
}

/**
 * 初回ログイン直後に呼ばれるプロフィール作成アクション。
 * 学生レコードはサインアップ時に作成済みのため、内容は updateProfile と同じく UPDATE で
 * 埋める。完了後はオンボーディングを抜けて学生トップへ遷移する。
 */
export async function createProfile(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const failure = await persistStudentProfile(formData, "createProfile");
  if (failure) return failure;

  revalidatePath("/student/profile");
  revalidatePath("/student/dashboard");

  redirect("/student/dashboard");
}
