import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getUserMock = vi.fn();
const getCompanyMembershipMock = vi.fn();
const searchStudentsMock = vi.fn();
const getStudentDetailMock = vi.fn();
const insertMock = vi.fn();
const deleteMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: getUserMock },
      from: vi.fn((table: string) => {
        if (table === "saved_searches") {
          return {
            insert: insertMock,
            delete: () => ({
              eq: () => ({
                eq: deleteMock,
              }),
            }),
          };
        }
        return {};
      }),
    }),
  ),
}));

vi.mock("@/features/company/app/students/queries", () => ({
  getCompanyMembership: (...args: unknown[]) =>
    getCompanyMembershipMock(...args),
  searchStudents: (...args: unknown[]) => searchStudentsMock(...args),
  getStudentDetail: (...args: unknown[]) => getStudentDetailMock(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

function buildFormData(values: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      for (const v of value) {
        fd.append(key, v);
      }
    } else {
      fd.set(key, value);
    }
  }
  return fd;
}

function validSearchForm(
  overrides: Record<string, string | string[]> = {},
): FormData {
  return buildFormData({
    graduationYear: "2027",
    academicTypes: [],
    regions: [],
    minConfidence: "",
    wantGrowthStability: "50",
    wantSpecialistGeneralist: "50",
    wantIndividualTeam: "50",
    wantAutonomyGuidance: "50",
    minLogicalThinking: "0",
    minCommunication: "0",
    minWritingSkill: "0",
    minLeadership: "0",
    minActivityVolume: "0",
    ...overrides,
  });
}

function setupOwner() {
  getUserMock.mockResolvedValue({
    data: { user: { id: "user-1" } },
  });
  getCompanyMembershipMock.mockResolvedValue({
    companyId: "company-1",
    role: "owner",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("searchStudentsAction", () => {
  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { searchStudentsAction } = await import(
      "@/features/company/app/students/actions"
    );
    const result = await searchStudentsAction({}, validSearchForm());
    expect(result.error).toBe("ログインし直してください");
  });

  it("企業情報が見つからない場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    getCompanyMembershipMock.mockResolvedValue(null);

    const { searchStudentsAction } = await import(
      "@/features/company/app/students/actions"
    );
    const result = await searchStudentsAction({}, validSearchForm());
    expect(result.error).toBe("企業情報が見つかりません");
  });

  it("正常に検索できた場合は results を返す", async () => {
    setupOwner();
    searchStudentsMock.mockResolvedValue([
      {
        id: "11111111-1111-1111-1111-111111111111",
        university: "東京大学",
        faculty: "工学部",
        graduationYear: 2027,
        academicType: "science",
        logicalThinkingScore: 80,
        scoreConfidence: 75,
        scoreDistance: 5,
      },
    ]);

    const { searchStudentsAction } = await import(
      "@/features/company/app/students/actions"
    );
    const result = await searchStudentsAction({}, validSearchForm());

    expect(result.searched).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results![0].university).toBe("東京大学");
  });

  it("不正な academicType の場合はバリデーションエラーを返す", async () => {
    setupOwner();

    const { searchStudentsAction } = await import(
      "@/features/company/app/students/actions"
    );
    const result = await searchStudentsAction(
      {},
      validSearchForm({ academicTypes: ["invalid"] }),
    );
    expect(result.error).toBeDefined();
  });

  it("条件なしでも検索できる", async () => {
    setupOwner();
    searchStudentsMock.mockResolvedValue([]);

    const { searchStudentsAction } = await import(
      "@/features/company/app/students/actions"
    );
    const result = await searchStudentsAction(
      {},
      buildFormData({ graduationYear: "", academicTypes: [], regions: [] }),
    );

    expect(result.searched).toBe(true);
    expect(result.results).toEqual([]);
  });
});

describe("saveSearchAction", () => {
  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { saveSearchAction } = await import(
      "@/features/company/app/students/actions"
    );
    const fd = new FormData();
    fd.set("searchName", "テスト条件");
    fd.set("filtersJson", "{}");
    const result = await saveSearchAction({}, fd);
    expect(result.error).toBe("ログインし直してください");
  });

  it("名前が空の場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { saveSearchAction } = await import(
      "@/features/company/app/students/actions"
    );
    const fd = new FormData();
    fd.set("searchName", "");
    fd.set("filtersJson", "{}");
    const result = await saveSearchAction({}, fd);
    expect(result.error).toBe("検索条件の名前を入力してください");
  });

  it("不正な JSON の場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { saveSearchAction } = await import(
      "@/features/company/app/students/actions"
    );
    const fd = new FormData();
    fd.set("searchName", "テスト条件");
    fd.set("filtersJson", "not-json");
    const result = await saveSearchAction({}, fd);
    expect(result.error).toBe("検索条件が不正です");
  });

  it("正常に保存できた場合は success を返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    insertMock.mockResolvedValue({ error: null });

    const { saveSearchAction } = await import(
      "@/features/company/app/students/actions"
    );
    const fd = new FormData();
    fd.set("searchName", "テスト条件");
    fd.set("filtersJson", '{"graduationYear":"2027"}');
    const result = await saveSearchAction({}, fd);
    expect(result.success).toBe(true);
  });

  it("DB エラーの場合はエラーを返す（メッセージ隠蔽）", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    insertMock.mockResolvedValue({ error: { message: "constraint violation" } });

    const { saveSearchAction } = await import(
      "@/features/company/app/students/actions"
    );
    const fd = new FormData();
    fd.set("searchName", "テスト条件");
    fd.set("filtersJson", "{}");
    const result = await saveSearchAction({}, fd);
    expect(result.error).toBe("検索条件の保存に失敗しました");
    expect(result.error).not.toContain("constraint");
  });
});

describe("deleteSavedSearchAction", () => {
  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { deleteSavedSearchAction } = await import(
      "@/features/company/app/students/actions"
    );
    const result = await deleteSavedSearchAction("search-1");
    expect(result.error).toBe("ログインし直してください");
  });

  it("正常に削除できた場合は success を返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    deleteMock.mockResolvedValue({ error: null });

    const { deleteSavedSearchAction } = await import(
      "@/features/company/app/students/actions"
    );
    const result = await deleteSavedSearchAction("search-1");
    expect(result.success).toBe(true);
  });

  it("DB エラーの場合はエラーを返す（メッセージ隠蔽）", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    deleteMock.mockResolvedValue({ error: { message: "FK error" } });

    const { deleteSavedSearchAction } = await import(
      "@/features/company/app/students/actions"
    );
    const result = await deleteSavedSearchAction("search-1");
    expect(result.error).toBe("削除に失敗しました");
    expect(result.error).not.toContain("FK");
  });
});

describe("getStudentDetailAction", () => {
  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { getStudentDetailAction } = await import(
      "@/features/company/app/students/actions"
    );
    const result = await getStudentDetailAction("11111111-1111-1111-1111-111111111111");
    expect(result.error).toBe("ログインし直してください");
  });

  it("企業情報が見つからない場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    getCompanyMembershipMock.mockResolvedValue(null);

    const { getStudentDetailAction } = await import(
      "@/features/company/app/students/actions"
    );
    const result = await getStudentDetailAction("11111111-1111-1111-1111-111111111111");
    expect(result.error).toBe("企業情報が見つかりません");
  });

  it("学生が見つからない場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    getCompanyMembershipMock.mockResolvedValue({
      companyId: "company-1",
      role: "owner",
    });
    getStudentDetailMock.mockResolvedValue(null);

    const { getStudentDetailAction } = await import(
      "@/features/company/app/students/actions"
    );
    const result = await getStudentDetailAction("11111111-1111-1111-1111-111111111111");
    expect(result.error).toBe("学生が見つかりません");
  });

  it("正常に取得できた場合は data を返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    getCompanyMembershipMock.mockResolvedValue({
      companyId: "company-1",
      role: "owner",
    });
    getStudentDetailMock.mockResolvedValue({
      name: "佐藤 健太",
      university: "東京大学",
      faculty: "工学部",
    });

    const { getStudentDetailAction } = await import(
      "@/features/company/app/students/actions"
    );
    const result = await getStudentDetailAction("11111111-1111-1111-1111-111111111111");
    expect(result.data).toBeDefined();
    expect(result.data!.name).toBe("佐藤 健太");
  });
});
