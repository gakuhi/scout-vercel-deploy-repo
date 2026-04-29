import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getUserMock = vi.fn();
const fromMock = vi.fn();
const getCompanyMembershipMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: getUserMock },
      from: fromMock,
    }),
  ),
}));

vi.mock("@/features/company/app/jobs/queries", () => ({
  getCompanyMembership: (...args: unknown[]) =>
    getCompanyMembershipMock(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

function setupOwner() {
  getUserMock.mockResolvedValue({
    data: { user: { id: "user-1" } },
  });
  getCompanyMembershipMock.mockResolvedValue({
    companyId: "company-1",
    role: "owner",
  });
}

const validJobRow = {
  id: "job-1",
  published_at: null,
  title: "テストエンジニア",
  job_type: "システムエンジニア",
  job_category: "ソフトウエア",
  employment_type: "正社員",
  salary_range: "年収 500万〜700万円",
  work_location: "東京都千代田区",
  description: "開発業務",
  requirements: "3年以上の経験",
  benefits: "リモート可",
  target_graduation_years: [2027],
  hero_image_path: "company-1/hero.jpg",
};

function mockSelectThenUpdateChain(
  selectResult: { data: unknown; error: unknown },
  updateResult: { data: unknown; error: unknown },
) {
  let callCount = 0;
  return {
    select: vi.fn(() => {
      const chain: Record<string, unknown> = {};
      const methods = ["eq", "is"];
      for (const m of methods) {
        chain[m] = vi.fn(() => chain);
      }
      chain.maybeSingle = vi.fn(() => Promise.resolve(selectResult));
      return chain;
    }),
    update: vi.fn(() => {
      const chain: Record<string, unknown> = {};
      chain.eq = vi.fn(() => {
        callCount++;
        if (callCount >= 2) return Promise.resolve(updateResult);
        return chain;
      });
      return chain;
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("togglePublishAction", () => {
  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { togglePublishAction } = await import(
      "@/features/company/app/jobs/actions/toggle-publish"
    );
    const result = await togglePublishAction("job-1", true);
    expect(result.error).toBe("ログインし直してください");
  });

  it("member ロールの場合は権限エラーを返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    getCompanyMembershipMock.mockResolvedValue({
      companyId: "company-1",
      role: "member",
    });

    const { togglePublishAction } = await import(
      "@/features/company/app/jobs/actions/toggle-publish"
    );
    const result = await togglePublishAction("job-1", true);
    expect(result.error).toBe(
      "この操作は企業オーナーまたは管理者のみ実行できます",
    );
  });

  it("求人が見つからない場合はエラーを返す", async () => {
    setupOwner();
    fromMock.mockReturnValue(
      mockSelectThenUpdateChain(
        { data: null, error: null },
        { data: null, error: null },
      ),
    );

    const { togglePublishAction } = await import(
      "@/features/company/app/jobs/actions/toggle-publish"
    );
    const result = await togglePublishAction("nonexistent", true);
    expect(result.error).toBe("求人が見つかりません");
  });

  it("公開に切り替えが成功した場合は success を返す", async () => {
    setupOwner();
    fromMock.mockReturnValue(
      mockSelectThenUpdateChain(
        { data: validJobRow, error: null },
        { data: null, error: null },
      ),
    );

    const { togglePublishAction } = await import(
      "@/features/company/app/jobs/actions/toggle-publish"
    );
    const result = await togglePublishAction("job-1", true);
    expect(result.success).toBe(true);
    expect(revalidatePathMock).toHaveBeenCalledWith("/company/jobs");
  });

  it("非公開化（publish=false）は必須項目を検証しない", async () => {
    setupOwner();
    fromMock.mockReturnValue(
      mockSelectThenUpdateChain(
        {
          data: { ...validJobRow, title: "", description: null, hero_image_path: null },
          error: null,
        },
        { data: null, error: null },
      ),
    );

    const { togglePublishAction } = await import(
      "@/features/company/app/jobs/actions/toggle-publish"
    );
    const result = await togglePublishAction("job-1", false);
    expect(result.success).toBe(true);
  });

  it("必須項目が未入力の求人は公開できない", async () => {
    setupOwner();
    fromMock.mockReturnValue(
      mockSelectThenUpdateChain(
        { data: { ...validJobRow, description: null }, error: null },
        { data: null, error: null },
      ),
    );

    const { togglePublishAction } = await import(
      "@/features/company/app/jobs/actions/toggle-publish"
    );
    const result = await togglePublishAction("job-1", true);
    expect(result.error).toContain("未入力の必須項目があるため公開できません");
  });

  it("トップ画像が未設定の求人は公開できない", async () => {
    setupOwner();
    fromMock.mockReturnValue(
      mockSelectThenUpdateChain(
        { data: { ...validJobRow, hero_image_path: null }, error: null },
        { data: null, error: null },
      ),
    );

    const { togglePublishAction } = await import(
      "@/features/company/app/jobs/actions/toggle-publish"
    );
    const result = await togglePublishAction("job-1", true);
    expect(result.error).toContain("トップ画像が未設定のため公開できません");
  });

  it("UPDATE が失敗した場合はエラーを返す（DBエラーは隠蔽）", async () => {
    setupOwner();
    fromMock.mockReturnValue(
      mockSelectThenUpdateChain(
        { data: validJobRow, error: null },
        { data: null, error: { message: "internal error" } },
      ),
    );

    const { togglePublishAction } = await import(
      "@/features/company/app/jobs/actions/toggle-publish"
    );
    const result = await togglePublishAction("job-1", true);
    expect(result.error).toBe("更新に失敗しました");
    expect(result.error).not.toContain("internal");
  });
});

describe("deleteJobAction", () => {
  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { deleteJobAction } = await import(
      "@/features/company/app/jobs/actions/toggle-publish"
    );
    const result = await deleteJobAction("job-1");
    expect(result.error).toBe("ログインし直してください");
  });

  it("member ロールの場合は権限エラーを返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    getCompanyMembershipMock.mockResolvedValue({
      companyId: "company-1",
      role: "member",
    });

    const { deleteJobAction } = await import(
      "@/features/company/app/jobs/actions/toggle-publish"
    );
    const result = await deleteJobAction("job-1");
    expect(result.error).toBe(
      "この操作は企業オーナーまたは管理者のみ実行できます",
    );
  });

  it("削除が成功した場合は success を返す", async () => {
    setupOwner();
    const updateChain: Record<string, unknown> = {};
    let eqCount = 0;
    updateChain.eq = vi.fn(() => {
      eqCount++;
      if (eqCount >= 2) return Promise.resolve({ data: null, error: null });
      return updateChain;
    });
    fromMock.mockReturnValue({
      update: vi.fn(() => updateChain),
    });

    const { deleteJobAction } = await import(
      "@/features/company/app/jobs/actions/toggle-publish"
    );
    const result = await deleteJobAction("job-1");
    expect(result.success).toBe(true);
    expect(revalidatePathMock).toHaveBeenCalledWith("/company/jobs");
  });

  it("DELETE が失敗した場合はエラーを返す（DBエラーは隠蔽）", async () => {
    setupOwner();
    const updateChain: Record<string, unknown> = {};
    let eqCount = 0;
    updateChain.eq = vi.fn(() => {
      eqCount++;
      if (eqCount >= 2)
        return Promise.resolve({
          data: null,
          error: { message: "FK violation" },
        });
      return updateChain;
    });
    fromMock.mockReturnValue({
      update: vi.fn(() => updateChain),
    });

    const { deleteJobAction } = await import(
      "@/features/company/app/jobs/actions/toggle-publish"
    );
    const result = await deleteJobAction("job-1");
    expect(result.error).toBe("削除に失敗しました");
    expect(result.error).not.toContain("FK");
  });
});
