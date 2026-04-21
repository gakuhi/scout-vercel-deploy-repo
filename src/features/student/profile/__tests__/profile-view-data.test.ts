import { describe, it, expect, vi, beforeEach } from "vitest";

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

  it("統合プロフィールがある場合はスコアに値が入る", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow(),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.logicalThinkingScore).toBe(50);
    expect(result!.integratedProfile.leadershipScore).toBe(50);
    expect(result!.integratedProfile.summary).toBe("論理性が高い学生");
  });

  it("統合プロフィールがない場合はスコアが全て null になる", async () => {
    setupMockSupabase({ integratedProfile: null });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.logicalThinkingScore).toBeNull();
    expect(result!.integratedProfile.communicationScore).toBeNull();
    expect(result!.integratedProfile.growthStabilityScore).toBeNull();
    expect(result!.integratedProfile.activityVolumeScore).toBeNull();
    expect(result!.integratedProfile.leadershipScore).toBeNull();
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

  // ─── 興味関心（interests JSONB） ───

  it("interests JSONB から industries / jobTypes を抽出する", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow({
        interests: {
          industries: ["it_software", "consulting"],
          jobTypes: ["engineer_it"],
        },
      }),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.interestedIndustries).toEqual([
      "it_software",
      "consulting",
    ]);
    expect(result!.integratedProfile.interestedJobTypes).toEqual(["engineer_it"]);
  });

  it("interests が null の場合は industries / jobTypes が空配列になる", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow({ interests: null }),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.interestedIndustries).toEqual([]);
    expect(result!.integratedProfile.interestedJobTypes).toEqual([]);
  });

  it("interests の industries が配列以外の場合は空配列になる", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow({
        interests: { industries: "invalid", jobTypes: [] },
      }),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.interestedIndustries).toEqual([]);
  });

  it("interests の要素に文字列以外が混じっている場合はフィルタされる", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow({
        interests: {
          industries: ["it_software", 123, null, "finance"],
          jobTypes: [],
        },
      }),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.interestedIndustries).toEqual([
      "it_software",
      "finance",
    ]);
  });

  // ─── 就活活動量（activity_level TEXT） ───

  it("activity_level = 'high' の場合は activityLevel に 'high' が入る", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow({ activity_level: "high" }),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.activityLevel).toBe("high");
  });

  it("activity_level = 'medium' の場合は activityLevel に 'medium' が入る", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow({ activity_level: "medium" }),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.activityLevel).toBe("medium");
  });

  it("activity_level = 'low' の場合は activityLevel に 'low' が入る", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow({ activity_level: "low" }),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.activityLevel).toBe("low");
  });

  it("activity_level が想定外の値の場合は activityLevel が null になる", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow({ activity_level: "extreme" }),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.activityLevel).toBeNull();
  });

  it("activity_level が null の場合は activityLevel が null になる", async () => {
    setupMockSupabase({
      integratedProfile: integratedProfileRow({ activity_level: null }),
    });

    const result = await getProfileViewData();
    expect(result!.integratedProfile.activityLevel).toBeNull();
  });
});
