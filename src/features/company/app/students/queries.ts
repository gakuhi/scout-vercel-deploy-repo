import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SearchFilter } from "./schemas";
import type { ProfileMock, IntegratedProfile, IndustryCategory, JobCategory, ActivityLevel } from "@/features/student/profile/mock";
import { resolveProfileImageUrl } from "@/features/student/profile/image-url";

export type StudentResult = {
  id: string;
  university: string | null;
  faculty: string | null;
  graduationYear: number | null;
  academicType: string | null;
  prefecture: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  summary: string | null;
  strengths: string[] | null;
  skills: string[] | null;
  // スコア
  growthStabilityScore: number | null;
  specialistGeneralistScore: number | null;
  individualTeamScore: number | null;
  autonomyGuidanceScore: number | null;
  logicalThinkingScore: number | null;
  communicationScore: number | null;
  writingSkillScore: number | null;
  leadershipScore: number | null;
  activityVolumeScore: number | null;
  scoreConfidence: number | null;
  // 興味タグ
  interestedIndustries: string[] | null;
  interestedJobTypes: string[] | null;
  // マッチング距離（小さいほど近い）
  scoreDistance: number;
};

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

/**
 * 志向スコアの距離を計算する（設計書 Layer 3）
 * 企業が設定した希望値と学生のスコアの差の絶対値を合算
 * MVP: 全軸同じ重み
 */
function calcScoreDistance(
  student: {
    growth_stability_score: number | null;
    specialist_generalist_score: number | null;
    individual_team_score: number | null;
    autonomy_guidance_score: number | null;
  },
  filter: SearchFilter,
): number {
  let distance = 0;
  let axes = 0;

  const pairs: [number | null, number | null][] = [
    [student.growth_stability_score, filter.wantGrowthStability],
    [student.specialist_generalist_score, filter.wantSpecialistGeneralist],
    [student.individual_team_score, filter.wantIndividualTeam],
    [student.autonomy_guidance_score, filter.wantAutonomyGuidance],
  ];

  for (const [studentScore, wantScore] of pairs) {
    if (wantScore !== null && studentScore !== null) {
      distance += Math.abs(studentScore - wantScore);
      axes++;
    }
  }

  // 軸数で正規化（設定した軸が多いほど不利にならないように）
  return axes > 0 ? distance / axes : 0;
}

export async function searchStudents(
  filter: SearchFilter,
): Promise<StudentResult[]> {
  const supabase = await createClient();

  let query = supabase.from("searchable_students").select("*");

  // Layer 1: 構造化フィルタ
  if (filter.graduationYear !== null) {
    query = query.eq("graduation_year", filter.graduationYear);
  }
  if (filter.academicTypes.length > 0) {
    query = query.in("academic_type", filter.academicTypes);
  }
  if (filter.minConfidence !== null) {
    query = query.gte("score_confidence", filter.minConfidence);
  }
  // regions はビューにカラムがないため将来対応

  // Layer 3: 能力スコア（最低値フィルタ — WHERE句）
  if (filter.minLogicalThinking !== null) {
    query = query.gte("logical_thinking_score", filter.minLogicalThinking);
  }
  if (filter.minCommunication !== null) {
    query = query.gte("communication_score", filter.minCommunication);
  }
  if (filter.minWritingSkill !== null) {
    query = query.gte("writing_skill_score", filter.minWritingSkill);
  }
  if (filter.minLeadership !== null) {
    query = query.gte("leadership_score", filter.minLeadership);
  }
  if (filter.minActivityVolume !== null) {
    query = query.gte("activity_volume_score", filter.minActivityVolume);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Layer 3: 志向スコア（距離計算でソート）
  const results = data
    .filter((row) => row.id !== null)
    .map((row) => ({
      id: row.id!,
      university: row.university,
      faculty: row.faculty,
      graduationYear: row.graduation_year,
      academicType: row.academic_type,
      prefecture: row.prefecture,
      bio: row.bio,
      profileImageUrl: row.profile_image_url,
      summary: row.summary,
      strengths: row.strengths as string[] | null,
      skills: row.skills as string[] | null,
      growthStabilityScore: row.growth_stability_score,
      specialistGeneralistScore: row.specialist_generalist_score,
      individualTeamScore: row.individual_team_score,
      autonomyGuidanceScore: row.autonomy_guidance_score,
      logicalThinkingScore: row.logical_thinking_score,
      communicationScore: row.communication_score,
      writingSkillScore: row.writing_skill_score,
      leadershipScore: row.leadership_score,
      activityVolumeScore: row.activity_volume_score,
      scoreConfidence: row.score_confidence,
      interestedIndustries: row.interested_industries as string[] | null,
      interestedJobTypes: row.interested_job_types as string[] | null,
      scoreDistance: calcScoreDistance(row, filter),
    }));

  // 志向スコアの距離が小さい順にソート
  // 距離が同じ場合は信頼度が高い順
  results.sort((a, b) => {
    const distDiff = a.scoreDistance - b.scoreDistance;
    if (distDiff !== 0) return distDiff;
    return (b.scoreConfidence ?? 0) - (a.scoreConfidence ?? 0);
  });
  const top = results.slice(0, 50);

  // Storage パスは署名URLへ解決（外部URLはそのまま）。返却する50件のみ実行。
  return Promise.all(
    top.map(async (r) => ({
      ...r,
      profileImageUrl: await resolveProfileImageUrl(supabase, r.profileImageUrl),
    })),
  );
}

// --- 検索条件の保存・読み込み ---

export type SavedSearch = {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  createdAt: string | null;
};

export async function listSavedSearches(
  userId: string,
): Promise<SavedSearch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_searches")
    .select("id, name, filters, created_at")
    .eq("company_member_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    filters: row.filters as Record<string, unknown>,
    createdAt: row.created_at,
  }));
}

// --- 学生詳細（ドロワー表示用） ---

function toActivityLevel(score: number | null): ActivityLevel | null {
  if (score === null) return null;
  if (score <= 30) return "low";
  if (score <= 60) return "medium";
  return "high";
}

export async function getStudentDetail(
  studentId: string,
): Promise<ProfileMock | null> {
  const supabase = await createClient();

  const { data: student, error: sErr } = await supabase
    .from("students")
    .select(
      "id, email, phone, last_name, first_name, university, faculty, department, prefecture, graduation_year, profile_image_url, bio, is_profile_public, mbti_type_id, data_consent_granted_at",
    )
    .eq("id", studentId)
    .eq("is_profile_public", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (sErr || !student) return null;

  const [{ data: profile }, { data: links }] = await Promise.all([
    supabase
      .from("student_integrated_profiles")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle(),
    supabase
      .from("student_product_links")
      .select("product, external_user_id")
      .eq("student_id", studentId),
  ]);

  // MBTI
  let mbtiTypeCode: string | null = null;
  let mbtiTypeName: string | null = null;
  if (student.mbti_type_id) {
    const { data: mbti } = await supabase
      .from("mbti_types")
      .select("type_code, name_ja")
      .eq("id", student.mbti_type_id)
      .maybeSingle();
    if (mbti) {
      mbtiTypeCode = mbti.type_code;
      mbtiTypeName = mbti.name_ja;
    }
  }

  const integratedProfile: IntegratedProfile = {
    summary: profile?.summary ?? "",
    strengths: (profile?.strengths as string[]) ?? [],
    skills: (profile?.skills as string[]) ?? [],
    growthStabilityScore: profile?.growth_stability_score ?? null,
    specialistGeneralistScore: profile?.specialist_generalist_score ?? null,
    individualTeamScore: profile?.individual_team_score ?? null,
    autonomyGuidanceScore: profile?.autonomy_guidance_score ?? null,
    logicalThinkingScore: profile?.logical_thinking_score ?? null,
    communicationScore: profile?.communication_score ?? null,
    writingSkillScore: profile?.writing_skill_score ?? null,
    leadershipScore: profile?.leadership_score ?? null,
    activityVolumeScore: profile?.activity_volume_score ?? null,
    activityLevel: toActivityLevel(profile?.activity_volume_score ?? null),
    interestedIndustries:
      (profile?.interested_industries as IndustryCategory[]) ?? [],
    interestedJobTypes:
      (profile?.interested_job_types as JobCategory[]) ?? [],
    scoreConfidence: profile?.score_confidence ?? 0,
  };

  // productCounts: 各プロダクトの利用件数
  const extId = (product: string) =>
    (links ?? []).find((l) => l.product === product)?.external_user_id;

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

  const productCounts = [
    { label: "ESデータ", icon: "description", value: esRes.count ?? 0 },
    { label: "企業分析", icon: "analytics", value: researchRes.count ?? 0 },
    { label: "面接練習", icon: "record_voice_over", value: interviewRes.count ?? 0 },
    { label: "活動一覧", icon: "format_list_bulleted", value: (links ?? []).length },
  ];

  // verifiedAt: データ連携同意日
  const verifiedAt = student.data_consent_granted_at
    ? new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "2-digit",
      }).format(new Date(student.data_consent_granted_at))
    : "";

  // スカウト承諾前は名前と連絡先を非表示にする（描画側で抑制）
  return {
    name: "",
    university: student.university ?? "",
    faculty: student.faculty ?? "",
    department: student.department ?? "",
    prefecture: student.prefecture ?? "",
    graduationYear: student.graduation_year,
    avatarInitials: "",
    profileImageUrl: await resolveProfileImageUrl(supabase, student.profile_image_url),
    email: "",
    phone: "",
    bio: student.bio ?? "",
    isProfilePublic: student.is_profile_public ?? false,
    mbtiTypeCode,
    mbtiTypeName,
    integratedProfile,
    productCounts,
    scoutSettings: [],
    verifiedAt,
  };
}
