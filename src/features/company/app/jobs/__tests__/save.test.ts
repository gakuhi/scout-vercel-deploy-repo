import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getUserMock = vi.fn();
const fromMock = vi.fn();
const storageUploadMock = vi.fn();
const getCompanyMembershipMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: getUserMock },
      from: fromMock,
      storage: {
        from: vi.fn(() => ({
          upload: storageUploadMock,
        })),
      },
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

function buildFormData(values: Record<string, string | File>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    fd.set(key, value);
  }
  return fd;
}

function makeImage(): File {
  return new File(["dummy"], "hero.jpg", { type: "image/jpeg" });
}

function validJobForm(overrides: Record<string, string | File> = {}): FormData {
  return buildFormData({
    title: "テストエンジニア",
    jobType: "システムエンジニア",
    jobCategory: "ソフトウエア",
    employmentType: "正社員",
    salaryRange: "年収 500万〜700万円",
    workLocation: "東京都千代田区",
    description: "開発業務",
    requirements: "3年以上の経験",
    benefits: "リモート可",
    targetGraduationYears: "2027",
    heroImage: makeImage(),
    action: "draft",
    ...overrides,
  });
}

function mockInsertChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.insert = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

function mockSelectThenUpdateChain(
  selectResult: { data: unknown; error: unknown },
  updateResult: { data: unknown; error: unknown },
) {
  let callCount = 0;
  return {
    select: vi.fn(() => {
      const selectChain: Record<string, unknown> = {};
      const methods = ["eq", "is"];
      for (const m of methods) {
        selectChain[m] = vi.fn(() => selectChain);
      }
      selectChain.maybeSingle = vi.fn(() => Promise.resolve(selectResult));
      return selectChain;
    }),
    update: vi.fn(() => {
      const updateChain: Record<string, unknown> = {};
      updateChain.eq = vi.fn(() => {
        callCount++;
        if (callCount >= 2) return Promise.resolve(updateResult);
        return updateChain;
      });
      return updateChain;
    }),
  };
}

function setupOwner() {
  getUserMock.mockResolvedValue({
    data: { user: { id: "user-1" } },
  });
  getCompanyMembershipMock.mockResolvedValue({
    companyId: "company-1",
    role: "owner",
  });
  storageUploadMock.mockResolvedValue({ data: { path: "x" }, error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createJobAction", () => {
  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { createJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const result = await createJobAction({}, validJobForm());
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

    const { createJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const result = await createJobAction({}, validJobForm());
    expect(result.error).toBe(
      "求人の作成は企業オーナーまたは管理者のみ実行できます",
    );
  });

  it("タイトルが空の場合はバリデーションエラーを返す", async () => {
    setupOwner();

    const { createJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const result = await createJobAction({}, validJobForm({ title: "" }));
    expect(result.error).toBe("求人タイトルを入力してください");
  });

  it("不正な業種の場合はバリデーションエラーを返す", async () => {
    setupOwner();

    const { createJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const result = await createJobAction(
      {},
      validJobForm({ jobCategory: "存在しない業種" }),
    );
    expect(result.error).toBe("有効な業種を選択してください");
  });

  it("不正な雇用形態の場合はバリデーションエラーを返す", async () => {
    setupOwner();

    const { createJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const result = await createJobAction(
      {},
      validJobForm({ employmentType: "アルバイト" }),
    );
    expect(result.error).toBe("有効な雇用形態を選択してください");
  });

  it("公開時に画像が未アップロードの場合はエラーを返す", async () => {
    setupOwner();

    const { createJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const fd = validJobForm({ action: "publish" });
    fd.delete("heroImage");
    const result = await createJobAction({}, fd);
    expect(result.error).toBe("トップ画像をアップロードしてください");
  });

  it("画像が10MBを超える場合はエラーを返す（公開でも下書きでも）", async () => {
    setupOwner();

    const { createJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const oversized = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      "big.jpg",
      { type: "image/jpeg" },
    );
    const fd = validJobForm({ action: "draft", heroImage: oversized });
    const result = await createJobAction({}, fd);
    expect(result.error).toBe("画像サイズは10MB以内にしてください");
  });

  it("画像の MIME type が許可外の場合はエラーを返す", async () => {
    setupOwner();

    const { createJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const badType = new File(["dummy"], "evil.gif", { type: "image/gif" });
    const fd = validJobForm({ heroImage: badType });
    const result = await createJobAction({}, fd);
    expect(result.error).toBe(
      "画像は JPG / PNG / WebP 形式のみアップロードできます",
    );
  });

  it("画像の拡張子が許可外の場合はエラーを返す", async () => {
    setupOwner();

    const { createJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    // image/jpeg と偽った .exe ファイル
    const spoofed = new File(["dummy"], "evil.exe", { type: "image/jpeg" });
    const fd = validJobForm({ heroImage: spoofed });
    const result = await createJobAction({}, fd);
    expect(result.error).toBe(
      "画像は JPG / PNG / WebP 形式のみアップロードできます",
    );
  });

  it("下書き保存は画像なしでも成功する", async () => {
    setupOwner();
    fromMock.mockReturnValue(
      mockInsertChain({ data: { id: "job-d" }, error: null }),
    );

    const { createJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const fd = validJobForm({ action: "draft" });
    fd.delete("heroImage");
    const result = await createJobAction({}, fd);
    expect(result.success).toBe(true);
  });

  it("下書き保存はタイトル以外が空でも成功する", async () => {
    setupOwner();
    const chain = mockInsertChain({ data: { id: "job-d2" }, error: null });
    fromMock.mockReturnValue(chain);

    const { createJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const fd = validJobForm({
      action: "draft",
      jobType: "",
      jobCategory: "",
      employmentType: "",
      salaryRange: "",
      workLocation: "",
      description: "",
      requirements: "",
      benefits: "",
      targetGraduationYears: "",
    });
    const result = await createJobAction({}, fd);
    expect(result.success).toBe(true);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        is_published: false,
        job_type: null,
        job_category: null,
      }),
    );
  });

  it("下書き保存でもタイトルが空ならエラー", async () => {
    setupOwner();

    const { createJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const fd = validJobForm({ action: "draft", title: "" });
    const result = await createJobAction({}, fd);
    expect(result.error).toBe("求人タイトルを入力してください");
  });

  it("下書き保存が成功した場合は success を返す", async () => {
    setupOwner();
    fromMock.mockReturnValue(
      mockInsertChain({ data: { id: "job-1" }, error: null }),
    );

    const { createJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const result = await createJobAction({}, validJobForm());

    expect(result.success).toBe(true);
    expect(result.jobId).toBe("job-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/company/jobs");
  });

  it("公開保存の場合は is_published=true で作成される", async () => {
    setupOwner();
    const chain = mockInsertChain({ data: { id: "job-2" }, error: null });
    fromMock.mockReturnValue(chain);

    const { createJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const result = await createJobAction(
      {},
      validJobForm({ action: "publish" }),
    );

    expect(result.success).toBe(true);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_published: true }),
    );
  });

  it("INSERT が失敗した場合はエラーを返す（DBエラーは隠蔽）", async () => {
    setupOwner();
    fromMock.mockReturnValue(
      mockInsertChain({ data: null, error: { message: "duplicate key" } }),
    );

    const { createJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const result = await createJobAction({}, validJobForm());

    expect(result.error).toBe("求人の作成に失敗しました");
    expect(result.error).not.toContain("duplicate");
  });
});

describe("updateJobAction", () => {
  it("jobId がない場合はエラーを返す", async () => {
    const { updateJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const fd = validJobForm();
    const result = await updateJobAction({}, fd);
    expect(result.error).toBe("求人IDが不正です");
  });

  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { updateJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const fd = validJobForm();
    fd.set("jobId", "job-1");
    const result = await updateJobAction({}, fd);
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

    const { updateJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const fd = validJobForm();
    fd.set("jobId", "job-1");
    const result = await updateJobAction({}, fd);
    expect(result.error).toBe(
      "求人の編集は企業オーナーまたは管理者のみ実行できます",
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

    const { updateJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const fd = validJobForm();
    fd.set("jobId", "nonexistent-job");
    const result = await updateJobAction({}, fd);
    expect(result.error).toBe("求人が見つかりません");
  });

  it("正常に更新できた場合は success を返す", async () => {
    setupOwner();
    fromMock.mockReturnValue(
      mockSelectThenUpdateChain(
        {
          data: {
            id: "job-1",
            is_published: false,
            published_at: null,
            hero_image_path: "company-1/existing.jpg",
          },
          error: null,
        },
        { data: null, error: null },
      ),
    );

    const { updateJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const fd = validJobForm();
    fd.set("jobId", "job-1");
    fd.delete("heroImage"); // 既存画像を維持するパターン
    const result = await updateJobAction({}, fd);
    expect(result.success).toBe(true);
    expect(result.jobId).toBe("job-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/company/jobs");
  });

  it("公開時に既存画像なし & 新規アップロードもない場合はエラー", async () => {
    setupOwner();
    fromMock.mockReturnValue(
      mockSelectThenUpdateChain(
        {
          data: {
            id: "job-1",
            is_published: false,
            published_at: null,
            hero_image_path: null,
          },
          error: null,
        },
        { data: null, error: null },
      ),
    );

    const { updateJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const fd = validJobForm({ action: "publish" });
    fd.set("jobId", "job-1");
    fd.delete("heroImage");
    const result = await updateJobAction({}, fd);
    expect(result.error).toBe("トップ画像をアップロードしてください");
  });

  it("公開時に既存画像を削除しようとして新規アップロードもない場合はエラー", async () => {
    setupOwner();
    fromMock.mockReturnValue(
      mockSelectThenUpdateChain(
        {
          data: {
            id: "job-1",
            is_published: false,
            published_at: null,
            hero_image_path: "company-1/existing.jpg",
          },
          error: null,
        },
        { data: null, error: null },
      ),
    );

    const { updateJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const fd = validJobForm({ action: "publish" });
    fd.set("jobId", "job-1");
    fd.set("removeHeroImage", "true");
    fd.delete("heroImage");
    const result = await updateJobAction({}, fd);
    expect(result.error).toBe("トップ画像をアップロードしてください");
  });

  it("下書き保存では既存画像なし & 新規アップロードなしでも成功する", async () => {
    setupOwner();
    fromMock.mockReturnValue(
      mockSelectThenUpdateChain(
        {
          data: {
            id: "job-1",
            is_published: false,
            published_at: null,
            hero_image_path: null,
          },
          error: null,
        },
        { data: null, error: null },
      ),
    );

    const { updateJobAction } = await import(
      "@/features/company/app/jobs/actions/save"
    );
    const fd = validJobForm({ action: "draft" });
    fd.set("jobId", "job-1");
    fd.delete("heroImage");
    const result = await updateJobAction({}, fd);
    expect(result.success).toBe(true);
  });
});
