import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getCompanyMembershipMock = vi.fn();
const getUserMock = vi.fn();
const updateMock = vi.fn();
const revalidatePathMock = vi.fn();
const uploadFileMock = vi.fn();
const validateFileMock = vi.fn();
const getPublicUrlMock = vi.fn();

vi.mock("@/features/company/shared/queries", () => ({
  getCompanyMembership: (...args: unknown[]) =>
    getCompanyMembershipMock(...args),
  // deprecated wrappers（既存コードの互換用）
  getCompanyIdForUser: vi.fn((userId: string) =>
    getCompanyMembershipMock(userId).then(
      (m: { companyId: string } | null) => m?.companyId ?? null,
    ),
  ),
  getCurrentUserRole: vi.fn((userId: string) =>
    getCompanyMembershipMock(userId).then(
      (m: { role: string } | null) => m?.role ?? null,
    ),
  ),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: getUserMock },
      from: vi.fn(() => ({
        update: updateMock.mockReturnValue({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        }),
      })),
    }),
  ),
}));

vi.mock("@/lib/storage", () => ({
  uploadFile: (...args: unknown[]) => uploadFileMock(...args),
  validateFile: (...args: unknown[]) => validateFileMock(...args),
  getPublicUrl: (...args: unknown[]) => getPublicUrlMock(...args),
  BUCKETS: {
    "company-logos": {
      maxSizeMB: 5,
      allowedTypes: ["image/png", "image/jpeg", "image/webp"],
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

function buildFormData(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    fd.set(key, value);
  }
  return fd;
}

const validForm = buildFormData({
  name: "テスト株式会社",
  industry: "it_software",
  employeeCountRange: "11-50",
  websiteUrl: "",
  description: "テスト企業です",
  prefecture: "東京都",
  postalCode: "100-0001",
  city: "千代田区",
  street: "丸の内1-1-1",
  phone: "03-1234-5678",
});

function setupOwner() {
  getUserMock.mockResolvedValue({
    data: { user: { id: "user-1" } },
    error: null,
  });
  getCompanyMembershipMock.mockResolvedValue({
    companyId: "company-1",
    role: "owner",
  });
}

function setupAdmin() {
  getUserMock.mockResolvedValue({
    data: { user: { id: "user-2" } },
    error: null,
  });
  getCompanyMembershipMock.mockResolvedValue({
    companyId: "company-1",
    role: "admin",
  });
}

function setupMember() {
  getUserMock.mockResolvedValue({
    data: { user: { id: "user-3" } },
    error: null,
  });
  getCompanyMembershipMock.mockResolvedValue({
    companyId: "company-1",
    role: "member",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── updateCompanyAction ───

describe("updateCompanyAction", () => {
  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    const { updateCompanyAction } = await import(
      "@/features/company/app/settings/actions"
    );
    const result = await updateCompanyAction({}, validForm);

    expect(result.error).toBe("ログインし直してください");
  });

  it("member ロールの場合は権限エラーを返す", async () => {
    setupMember();

    const { updateCompanyAction } = await import(
      "@/features/company/app/settings/actions"
    );
    const result = await updateCompanyAction({}, validForm);

    expect(result.error).toBe(
      "この操作は企業オーナーまたは管理者のみ実行できます",
    );
  });

  it("会社名が空の場合はバリデーションエラーを返す", async () => {
    setupOwner();

    const emptyNameForm = buildFormData({
      name: "",
      industry: "",
      employeeCountRange: "",
      websiteUrl: "",
      description: "",
      prefecture: "",
      postalCode: "",
      city: "",
      street: "",
      phone: "",
    });

    const { updateCompanyAction } = await import(
      "@/features/company/app/settings/actions"
    );
    const result = await updateCompanyAction({}, emptyNameForm);

    expect(result.error).toBe("会社名を入力してください");
  });

  it("owner ロールで正常に更新できる", async () => {
    setupOwner();

    const { updateCompanyAction } = await import(
      "@/features/company/app/settings/actions"
    );
    const result = await updateCompanyAction({}, validForm);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(updateMock).toHaveBeenCalledOnce();
    expect(revalidatePathMock).toHaveBeenCalledWith("/company/settings");
  });

  it("admin ロールでも更新できる", async () => {
    setupAdmin();

    const { updateCompanyAction } = await import(
      "@/features/company/app/settings/actions"
    );
    const result = await updateCompanyAction({}, validForm);

    expect(result.success).toBe(true);
  });
});

// ─── uploadLogoAction ───

describe("uploadLogoAction", () => {
  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    const { uploadLogoAction } = await import(
      "@/features/company/app/settings/actions"
    );
    const fd = new FormData();
    fd.set("logo", new File(["x"], "logo.png", { type: "image/png" }));
    const result = await uploadLogoAction({}, fd);

    expect(result.error).toBe("ログインし直してください");
  });

  it("member ロールの場合は権限エラーを返す", async () => {
    setupMember();

    const { uploadLogoAction } = await import(
      "@/features/company/app/settings/actions"
    );
    const fd = new FormData();
    fd.set("logo", new File(["x"], "logo.png", { type: "image/png" }));
    const result = await uploadLogoAction({}, fd);

    expect(result.error).toBe(
      "この操作は企業オーナーまたは管理者のみ実行できます",
    );
  });

  it("ファイル未選択の場合はエラーを返す", async () => {
    setupOwner();

    const { uploadLogoAction } = await import(
      "@/features/company/app/settings/actions"
    );
    const fd = new FormData();
    fd.set("logo", new File([], "empty.png", { type: "image/png" }));
    const result = await uploadLogoAction({}, fd);

    expect(result.error).toBe("画像ファイルを選択してください");
  });

  it("validateFile が throw した場合はエラーメッセージを返す", async () => {
    setupOwner();
    validateFileMock.mockImplementation(() => {
      throw new Error("ファイルサイズが大きすぎます");
    });

    const { uploadLogoAction } = await import(
      "@/features/company/app/settings/actions"
    );
    const fd = new FormData();
    fd.set("logo", new File(["x"], "logo.png", { type: "image/png" }));
    const result = await uploadLogoAction({}, fd);

    expect(result.error).toBe("ファイルサイズが大きすぎます");
  });

  it("owner で正常にアップロードできる", async () => {
    setupOwner();
    validateFileMock.mockImplementation(() => {});
    uploadFileMock.mockResolvedValue(undefined);
    getPublicUrlMock.mockReturnValue("https://example.com/logo.png");

    const { uploadLogoAction } = await import(
      "@/features/company/app/settings/actions"
    );
    const fd = new FormData();
    fd.set("logo", new File(["x"], "logo.png", { type: "image/png" }));
    const result = await uploadLogoAction({}, fd);

    expect(result.success).toBe(true);
    expect(uploadFileMock).toHaveBeenCalledWith(
      expect.anything(),
      "company-logos",
      "company-1/logo.png",
      expect.any(File),
      { upsert: true },
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/company/settings");
  });

  it("MIME が image/jpeg の場合は拡張子が jpg になる", async () => {
    setupOwner();
    validateFileMock.mockImplementation(() => {});
    uploadFileMock.mockResolvedValue(undefined);
    getPublicUrlMock.mockReturnValue("https://example.com/logo.jpg");

    const { uploadLogoAction } = await import(
      "@/features/company/app/settings/actions"
    );
    const fd = new FormData();
    fd.set("logo", new File(["x"], "photo.JPEG", { type: "image/jpeg" }));
    const result = await uploadLogoAction({}, fd);

    expect(result.success).toBe(true);
    expect(uploadFileMock).toHaveBeenCalledWith(
      expect.anything(),
      "company-logos",
      "company-1/logo.jpg",
      expect.any(File),
      { upsert: true },
    );
  });

  it("uploadFile が失敗した場合はエラーを返す", async () => {
    setupOwner();
    validateFileMock.mockImplementation(() => {});
    uploadFileMock.mockRejectedValue(new Error("storage error"));

    const { uploadLogoAction } = await import(
      "@/features/company/app/settings/actions"
    );
    const fd = new FormData();
    fd.set("logo", new File(["x"], "logo.png", { type: "image/png" }));
    const result = await uploadLogoAction({}, fd);

    expect(result.error).toBe("アップロードに失敗しました: storage error");
  });
});

// ─── removeLogoAction ───

describe("removeLogoAction", () => {
  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    const { removeLogoAction } = await import(
      "@/features/company/app/settings/actions"
    );
    const result = await removeLogoAction();

    expect(result.error).toBe("ログインし直してください");
  });

  it("member ロールの場合は権限エラーを返す", async () => {
    setupMember();

    const { removeLogoAction } = await import(
      "@/features/company/app/settings/actions"
    );
    const result = await removeLogoAction();

    expect(result.error).toBe(
      "この操作は企業オーナーまたは管理者のみ実行できます",
    );
  });

  it("owner で正常にロゴを削除できる", async () => {
    setupOwner();

    const { removeLogoAction } = await import(
      "@/features/company/app/settings/actions"
    );
    const result = await removeLogoAction();

    expect(result.success).toBe(true);
    expect(updateMock).toHaveBeenCalledOnce();
    expect(revalidatePathMock).toHaveBeenCalledWith("/company/settings");
  });
});
