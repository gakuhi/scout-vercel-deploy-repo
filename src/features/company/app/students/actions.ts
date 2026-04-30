"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { searchFilterSchema } from "./schemas";
import { searchStudents, getCompanyMembership, getStudentDetail } from "./queries";
import type { StudentResult } from "./queries";
import type { ProfileMock } from "@/features/student/profile/mock";

export type SearchActionState = {
  error?: string;
  results?: StudentResult[];
  searched?: boolean;
};

export async function searchStudentsAction(
  _prev: SearchActionState,
  formData: FormData,
): Promise<SearchActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインし直してください" };

  const membership = await getCompanyMembership(user.id);
  if (!membership) return { error: "企業情報が見つかりません" };

  const graduationYear = formData.get("graduationYear");
  const academicTypes = formData.getAll("academicTypes") as string[];
  const regions = formData.getAll("regions") as string[];

  const parsed = searchFilterSchema.safeParse({
    graduationYear,
    academicTypes,
    regions,
    minConfidence: formData.get("minConfidence"),
    wantGrowthStability: formData.get("wantGrowthStability"),
    wantSpecialistGeneralist: formData.get("wantSpecialistGeneralist"),
    wantIndividualTeam: formData.get("wantIndividualTeam"),
    wantAutonomyGuidance: formData.get("wantAutonomyGuidance"),
    minLogicalThinking: formData.get("minLogicalThinking"),
    minCommunication: formData.get("minCommunication"),
    minWritingSkill: formData.get("minWritingSkill"),
    minLeadership: formData.get("minLeadership"),
    minActivityVolume: formData.get("minActivityVolume"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "検索条件を確認してください",
    };
  }

  const results = await searchStudents(parsed.data);

  return { results, searched: true };
}

// --- 検索条件の保存・削除 ---

export type SaveSearchState = {
  error?: string;
  success?: boolean;
};

const MAX_FILTERS_JSON_LENGTH = 10000;

export async function saveSearchAction(
  _prev: SaveSearchState,
  formData: FormData,
): Promise<SaveSearchState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインし直してください" };

  const membership = await getCompanyMembership(user.id);
  if (!membership) return { error: "企業情報が見つかりません" };

  const name = formData.get("searchName");
  if (typeof name !== "string" || !name.trim()) {
    return { error: "検索条件の名前を入力してください" };
  }

  const filtersJson = formData.get("filtersJson");
  if (typeof filtersJson !== "string") {
    return { error: "検索条件が不正です" };
  }
  if (filtersJson.length > MAX_FILTERS_JSON_LENGTH) {
    return { error: "検索条件が大きすぎます" };
  }

  let filters: Record<string, unknown>;
  try {
    filters = JSON.parse(filtersJson);
    if (typeof filters !== "object" || filters === null || Array.isArray(filters)) {
      return { error: "検索条件が不正です" };
    }
  } catch {
    return { error: "検索条件が不正です" };
  }

  const { error } = await supabase.from("saved_searches").insert({
    company_member_id: user.id,
    name: name.trim(),
    filters,
  });

  if (error) {
    console.error("saveSearchAction error:", error);
    return { error: "検索条件の保存に失敗しました" };
  }

  revalidatePath("/company/students");
  return { success: true };
}

export async function deleteSavedSearchAction(
  searchId: string,
): Promise<SaveSearchState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインし直してください" };

  const membership = await getCompanyMembership(user.id);
  if (!membership) return { error: "企業情報が見つかりません" };

  const { error } = await supabase
    .from("saved_searches")
    .delete()
    .eq("id", searchId)
    .eq("company_member_id", user.id);

  if (error) {
    console.error("deleteSavedSearchAction error:", error);
    return { error: "削除に失敗しました" };
  }

  revalidatePath("/company/students");
  return { success: true };
}

// --- 学生詳細取得 ---

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getStudentDetailAction(
  studentId: string,
  options?: { includePersonalInfo?: boolean },
): Promise<{ error?: string; data?: ProfileMock }> {
  if (!UUID_REGEX.test(studentId)) return { error: "無効なIDです" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインし直してください" };

  const membership = await getCompanyMembership(user.id);
  if (!membership) return { error: "企業情報が見つかりません" };

  const detail = await getStudentDetail(studentId, options);
  if (!detail) return { error: "学生が見つかりません" };

  return { data: detail };
}
