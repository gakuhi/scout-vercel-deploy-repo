import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Supabase server client をモック
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// redirect をモック（呼ばれないはずだが念のため）
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getProfileViewData } from "../actions";

const mockedCreateClient = vi.mocked(createClient);

/** テスト用の学生データ */
function studentRow(overrides = {}) {
  return {
    id: "user-001",
    last_name: "佐藤",
    first_name: "健太",
    university: "慶應義塾大学",
    faculty: "経済学部",
    department: "経済学科",
    graduation_year: 2027,
    profile_image_url: null,
    bio: "テスト自己紹介",
    ...overrides,
  };
}

/** テスト用の統合プロフィールデータ */
function integratedProfileRow(overrides = {}) {
  return {
    summary: "論理性が高い学生",
    strengths: ["論理的思考", "リーダーシップ"],
    skills: ["Python", "SQL"],
    ...overrides,
  };
}

/**
 * テーブル名ごとに戻り値を定義できる Supabase モック。
 * `from("students").select(...).eq(...).maybeSingle()` と
 * `from("student_product_links").select(...).eq(...)` （await 直接）の 2 形を
 * 同時に扱えるよう、チェーン末端を maybeSingle と thenable の両方で解決する。
 */
function createSupabaseMock({
  user,
  tables,
}: {
  user: { id: string } | null;
  tables: Record<string, unknown>;
}) {
  const chain = (table: string) => {
    const result = tables[table] ?? null;
    const link = {
      select: () => link,
      eq: () => link,
      order: () => link,
      maybeSingle: async () => ({ data: result, error: null }),
      // `await from(...).select(...).eq(...)` 形式で解決されるケース。
      then: (resolve: (v: { data: unknown; error: null }) => void) =>
        resolve({ data: result, error: null }),
    };
    return link;
  };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn((table: string) => chain(table)),
  };
}

function setupMockSupabase({
  user = { id: "user-001" } as { id: string } | null,
  student = studentRow() as ReturnType<typeof studentRow> | null,
  integratedProfile = null as ReturnType<typeof integratedProfileRow> | null,
  links = [] as { product: string; external_user_id: string }[],
} = {}) {
  const supabase = createSupabaseMock({
    user,
    tables: {
      students: student,
      student_integrated_profiles: integratedProfile,
      student_product_links: links,
    },
  });
  // `as never` で createClient の厳密な戻り値型を緩める（テスト専用モック）
  mockedCreateClient.mockResolvedValue(supabase as never);
  return supabase;
}

describe("getProfileViewData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未ログインの場合は null を返す", async () => {
    setupMockSupabase({ user: null });
    const result = await getProfileViewData();
    expect(result).toBeNull();
  });

  it("学生データが存在しない場合は null を返す", async () => {
    setupMockSupabase({ student: null });
    const result = await getProfileViewData();
    expect(result).toBeNull();
  });

  it("姓名からフルネームとイニシャルを生成する", async () => {
    setupMockSupabase();

    const result = await getProfileViewData();
    expect(result).not.toBeNull();
    expect(result!.name).toBe("佐藤 健太");
    expect(result!.avatarInitials).toBe("佐健");
  });

  it("姓名が null の場合はデフォルト値を返す", async () => {
    setupMockSupabase({
      student: studentRow({ last_name: null, first_name: null }),
    });

    const result = await getProfileViewData();
    expect(result!.name).toBe("未設定");
    expect(result!.avatarInitials).toBe("?");
  });

  it("統合プロフィールがある場合は summary/strengths/skills を転写する", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow(),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.summary).toBe("論理性が高い学生");
    expect(result!.integratedProfile.strengths).toEqual(["論理的思考", "リーダーシップ"]);
    expect(result!.integratedProfile.skills).toEqual(["Python", "SQL"]);
  });

  it("統合プロフィールがない場合はスコアが全て null になる", async () => {
    setupMockSupabase({ integratedProfile: null });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.logicalThinkingScore).toBeNull();
    expect(result!.integratedProfile.communicationScore).toBeNull();
    expect(result!.integratedProfile.growthStabilityScore).toBeNull();
    expect(result!.integratedProfile.activityVolumeScore).toBeNull();
    expect(result!.integratedProfile.leadershipScore).toBeNull();
    expect(result!.integratedProfile.scoreConfidence).toBeNull();
  });

  it("統合プロフィールがない場合はデフォルトのサマリーを返す", async () => {
    setupMockSupabase({ integratedProfile: null });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.summary).toBe(
      "4プロダクトとの連携後にAI統合プロフィールが生成されます。",
    );
  });

  it("strengths/skills が配列の場合はそのまま返す", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow({
        strengths: ["論理的思考", "データ分析"],
        skills: ["Python"],
      }),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.strengths).toEqual(["論理的思考", "データ分析"]);
    expect(result!.integratedProfile.skills).toEqual(["Python"]);
  });

  it("strengths/skills が配列でない場合は空配列を返す", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow({
        strengths: "文字列",
        skills: null,
      }),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.strengths).toEqual([]);
    expect(result!.integratedProfile.skills).toEqual([]);
  });

  it("大学が null の場合は「未設定」を返す", async () => {
    setupMockSupabase({
      student: studentRow({ university: null }),
    });

    const result = await getProfileViewData();
    expect(result!.university).toBe("未設定");
  });

  it("bio が null の場合は空文字を返す", async () => {
    setupMockSupabase({
      student: studentRow({ bio: null }),
    });

    const result = await getProfileViewData();
    expect(result!.bio).toBe("");
  });

  it("プロダクト連携なしの場合は syncedItems が全て空配列になる", async () => {
    setupMockSupabase({ links: [] });

    const result = await getProfileViewData();
    expect(result!.syncedItems!.es).toEqual([]);
    expect(result!.syncedItems!.researches).toEqual([]);
    expect(result!.syncedItems!.interviewSessions).toEqual([]);
    expect(result!.syncedItems!.sugoshu).toEqual([]);
  });

  it("productCounts の最後のラベルが「すごい就活」になっている", async () => {
    setupMockSupabase({ links: [] });

    const result = await getProfileViewData();
    expect(result!.productCounts[3].label).toBe("すごい就活");
  });

  // ─── プレビュー用に追加されたフィールド ───

  it("department / prefecture を返す", async () => {
    setupMockSupabase({
      student: studentRow({
        department: "情報工学科",
        prefecture: "神奈川県",
      }),
    });

    const result = await getProfileViewData();
    expect(result!.department).toBe("情報工学科");
    expect(result!.prefecture).toBe("神奈川県");
  });

  it("department / prefecture が null の場合は空文字を返す", async () => {
    setupMockSupabase({
      student: studentRow({ department: null, prefecture: null }),
    });

    const result = await getProfileViewData();
    expect(result!.department).toBe("");
    expect(result!.prefecture).toBe("");
  });

  it("email / phone を返す", async () => {
    setupMockSupabase({
      student: studentRow({
        email: "test@example.com",
        phone: "090-1111-2222",
      }),
    });

    const result = await getProfileViewData();
    expect(result!.email).toBe("test@example.com");
    expect(result!.phone).toBe("090-1111-2222");
  });

  it("email / phone が null の場合は空文字を返す", async () => {
    setupMockSupabase({
      student: studentRow({ email: null, phone: null }),
    });

    const result = await getProfileViewData();
    expect(result!.email).toBe("");
    expect(result!.phone).toBe("");
  });

  it("is_profile_public = true を返す", async () => {
    setupMockSupabase({
      student: studentRow({ is_profile_public: true }),
    });

    const result = await getProfileViewData();
    expect(result!.isProfilePublic).toBe(true);
  });

  it("is_profile_public が null の場合は false を返す", async () => {
    setupMockSupabase({
      student: studentRow({ is_profile_public: null }),
    });

    const result = await getProfileViewData();
    expect(result!.isProfilePublic).toBe(false);
  });

  it("graduation_year が null の場合は graduationYear に null を返す", async () => {
    setupMockSupabase({
      student: studentRow({ graduation_year: null }),
    });

    const result = await getProfileViewData();
    expect(result!.graduationYear).toBeNull();
  });

  // ─── mbti_types の結合解決（単体 / 配列 / null の 3 形を許容） ───

  it("mbti_types が単体オブジェクトで返るケースで type_code / name_ja を解決する", async () => {
    setupMockSupabase({
      student: studentRow({ mbti_types: { type_code: "INTJ", name_ja: "建築家" } }),
    });

    const result = await getProfileViewData();
    expect(result!.mbtiTypeCode).toBe("INTJ");
    expect(result!.mbtiTypeName).toBe("建築家");
  });

  it("mbti_types が配列で返るケースで先頭要素の type_code / name_ja を解決する", async () => {
    setupMockSupabase({
      student: studentRow({ mbti_types: [{ type_code: "INFP", name_ja: "仲介者" }] }),
    });

    const result = await getProfileViewData();
    expect(result!.mbtiTypeCode).toBe("INFP");
    expect(result!.mbtiTypeName).toBe("仲介者");
  });

  it("mbti_types が null の場合は mbtiTypeCode / mbtiTypeName が null になる", async () => {
    setupMockSupabase({
      student: studentRow({ mbti_types: null }),
    });

    const result = await getProfileViewData();
    expect(result!.mbtiTypeCode).toBeNull();
    expect(result!.mbtiTypeName).toBeNull();
  });

  it("mbti_types フィールドが無い場合も mbtiTypeCode / mbtiTypeName が null になる", async () => {
    setupMockSupabase({ student: studentRow() });

    const result = await getProfileViewData();
    expect(result!.mbtiTypeCode).toBeNull();
    expect(result!.mbtiTypeName).toBeNull();
  });

  it("mbti_types が空配列の場合は mbtiTypeCode / mbtiTypeName が null になる", async () => {
    setupMockSupabase({
      student: studentRow({ mbti_types: [] }),
    });

    const result = await getProfileViewData();
    expect(result!.mbtiTypeCode).toBeNull();
    expect(result!.mbtiTypeName).toBeNull();
  });

  // ─── 興味タグ（interested_industries / interested_job_types は DB 上 TEXT[]、
  //     許容値外はサーバ層で filter する） ───

  it("許容値の interested_industries / interested_job_types はそのまま返す", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow({
        interested_industries: ["it_software", "consulting"],
        interested_job_types: ["engineer_it"],
      }),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.interestedIndustries).toEqual([
      "it_software",
      "consulting",
    ]);
    expect(result!.integratedProfile.interestedJobTypes).toEqual(["engineer_it"]);
  });

  it("興味タグが null の場合は空配列になる", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow({
        interested_industries: null,
        interested_job_types: null,
      }),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.interestedIndustries).toEqual([]);
    expect(result!.integratedProfile.interestedJobTypes).toEqual([]);
  });

  it("許容値外の値（旧 Claude プロンプトの語彙ズレ等）は読込時に filter される", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow({
        // "internet_web" は industry_category に存在しない、null/数値はそもそも型外
        interested_industries: ["it_software", "internet_web", null, 123, "consulting"],
        // "engineer" は job_category に存在しない（engineer_it / engineer_other に分割されている）
        interested_job_types: ["engineer_it", "engineer", "unknown"],
      }),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.interestedIndustries).toEqual([
      "it_software",
      "consulting",
    ]);
    expect(result!.integratedProfile.interestedJobTypes).toEqual(["engineer_it"]);
  });

  // ─── 就活活動量（activity_volume_score から activityLevel を導出） ───

  it("activity_volume_score = 80 の場合は activityLevel が 'high' になる", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow({ activity_volume_score: 80 }),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.activityLevel).toBe("high");
  });

  it("activity_volume_score = 50 の場合は activityLevel が 'medium' になる", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow({ activity_volume_score: 50 }),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.activityLevel).toBe("medium");
  });

  it("activity_volume_score = 10 の場合は activityLevel が 'low' になる", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow({ activity_volume_score: 10 }),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.activityLevel).toBe("low");
  });

  it("activity_volume_score が null の場合は activityLevel が null になる", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow({ activity_volume_score: null }),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.activityLevel).toBeNull();
  });

  // 境界値: 0-30=low / 31-60=medium / 61-100=high
  it.each([
    [0, "low"],
    [30, "low"],
    [31, "medium"],
    [60, "medium"],
    [61, "high"],
    [100, "high"],
  ] as const)(
    "activity_volume_score = %i の場合は activityLevel = '%s'（境界値）",
    async (score, expected) => {
      setupMockSupabase({
        integratedProfile: integratedProfileRow({ activity_volume_score: score }),
      });

      const result = await getProfileViewData();
      expect(result!.integratedProfile.activityLevel).toBe(expected);
    },
  );

  // ─── 各スコアカラムをそのまま UI に渡す ───

  it("各スコアカラムを UI のフィールドへ素直に転写する", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow({
        growth_stability_score: 82,
        specialist_generalist_score: 65,
        individual_team_score: 45,
        autonomy_guidance_score: 70,
        logical_thinking_score: 75,
        communication_score: 68,
        writing_skill_score: 72,
        leadership_score: 60,
        activity_volume_score: 85,
        score_confidence: 75,
      }),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.growthStabilityScore).toBe(82);
    expect(result!.integratedProfile.specialistGeneralistScore).toBe(65);
    expect(result!.integratedProfile.individualTeamScore).toBe(45);
    expect(result!.integratedProfile.autonomyGuidanceScore).toBe(70);
    expect(result!.integratedProfile.logicalThinkingScore).toBe(75);
    expect(result!.integratedProfile.communicationScore).toBe(68);
    expect(result!.integratedProfile.writingSkillScore).toBe(72);
    expect(result!.integratedProfile.leadershipScore).toBe(60);
    expect(result!.integratedProfile.activityVolumeScore).toBe(85);
    expect(result!.integratedProfile.scoreConfidence).toBe(75);
  });
});
