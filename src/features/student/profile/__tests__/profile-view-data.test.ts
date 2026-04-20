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
});
