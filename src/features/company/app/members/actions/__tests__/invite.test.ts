import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Supabase client mock ---
const getUserMock = vi.fn();
const fromMock = vi.fn();
const resetPasswordForEmailMock = vi.fn();
const createClientMock = vi.fn(() => ({
  auth: {
    getUser: getUserMock,
    resetPasswordForEmail: resetPasswordForEmailMock,
  },
  from: fromMock,
}));

// --- Supabase admin mock ---
const inviteUserByEmailMock = vi.fn();
const updateUserByIdMock = vi.fn();
const deleteUserMock = vi.fn();
const adminFromMock = vi.fn();
const createAdminClientMock = vi.fn(() => ({
  auth: {
    admin: {
      inviteUserByEmail: inviteUserByEmailMock,
      updateUserById: updateUserByIdMock,
      deleteUser: deleteUserMock,
    },
  },
  from: adminFromMock,
}));

// --- queries mock ---
const getCompanyIdForUserMock = vi.fn();
const getCurrentUserRoleMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}));
vi.mock("@/features/company/app/members/queries", () => ({
  getCompanyIdForUser: getCompanyIdForUserMock,
  getCurrentUserRole: getCurrentUserRoleMock,
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const OWNER_ID = "owner-id-1";
const COMPANY_ID = "company-id-1";

function buildFormData(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    fd.set(key, value);
  }
  return fd;
}

function validFormData(overrides: Record<string, string> = {}): FormData {
  return buildFormData({
    lastName: "田中",
    firstName: "太郎",
    email: "new@example.com",
    role: "admin",
    ...overrides,
  });
}

/** fromMock のチェーン用ヘルパー */
function mockChain(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "insert", "update", "eq", "neq", "in", "order", "limit"];
  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(() => Promise.resolve(resolvedValue));
  chain.single = vi.fn(() => Promise.resolve(resolvedValue));
  chain.then = (resolve: (v: unknown) => void) => resolve(resolvedValue);
  return chain;
}

function setupAuthenticatedOwner() {
  getUserMock.mockResolvedValue({
    data: { user: { id: OWNER_ID, email: "owner@example.com" } },
  });
  getCompanyIdForUserMock.mockResolvedValue(COMPANY_ID);
  getCurrentUserRoleMock.mockResolvedValue("owner");
  // inviter & company data
  fromMock.mockImplementation((table: string) => {
    if (table === "company_members") {
      return mockChain({
        data: { last_name: "佐藤", first_name: "花子" },
        error: null,
      });
    }
    if (table === "companies") {
      return mockChain({
        data: { name: "テスト株式会社" },
        error: null,
      });
    }
    return mockChain({ data: null, error: null });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("inviteMemberAction", () => {
  // --- バリデーション ---
  it("メールアドレスが不正な場合はバリデーションエラーを返す", async () => {
    const { inviteMemberAction } = await import(
      "@/features/company/app/members/actions/invite"
    );
    const result = await inviteMemberAction({}, validFormData({ email: "bad" }));
    expect(result.error).toBe("有効なメールアドレスを入力してください");
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("姓が空の場合はバリデーションエラーを返す", async () => {
    const { inviteMemberAction } = await import(
      "@/features/company/app/members/actions/invite"
    );
    const result = await inviteMemberAction({}, validFormData({ lastName: "" }));
    expect(result.error).toBe("姓を入力してください");
  });

  // --- 認証・権限チェック ---
  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { inviteMemberAction } = await import(
      "@/features/company/app/members/actions/invite"
    );
    const result = await inviteMemberAction({}, validFormData());
    expect(result.error).toBe("ログインし直してください");
  });

  it("企業情報が見つからない場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: OWNER_ID, email: "owner@example.com" } },
    });
    getCompanyIdForUserMock.mockResolvedValue(null);
    getCurrentUserRoleMock.mockResolvedValue("owner");
    const { inviteMemberAction } = await import(
      "@/features/company/app/members/actions/invite"
    );
    const result = await inviteMemberAction({}, validFormData());
    expect(result.error).toBe("企業情報が見つかりません");
  });

  it("owner 以外のロールの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: OWNER_ID, email: "owner@example.com" } },
    });
    getCompanyIdForUserMock.mockResolvedValue(COMPANY_ID);
    getCurrentUserRoleMock.mockResolvedValue("admin");
    const { inviteMemberAction } = await import(
      "@/features/company/app/members/actions/invite"
    );
    const result = await inviteMemberAction({}, validFormData());
    expect(result.error).toBe("メンバー招待は企業オーナーのみ実行できます");
  });

  // --- 既存ユーザー（BAN なし） ---
  it("既存ユーザー（自社現役）の場合はエラーを返す", async () => {
    setupAuthenticatedOwner();
    inviteUserByEmailMock.mockResolvedValue({
      data: { user: null },
      error: { code: "email_exists", message: "email exists" },
    });
    const adminLookupChain = mockChain({
      data: { id: "existing-id", company_id: COMPANY_ID, is_active: true },
      error: null,
    });
    adminFromMock.mockReturnValue(adminLookupChain);

    const { inviteMemberAction } = await import(
      "@/features/company/app/members/actions/invite"
    );
    const result = await inviteMemberAction({}, validFormData());
    expect(result.error).toBe("このメールアドレスは既に登録されています");
    expect(updateUserByIdMock).not.toHaveBeenCalled();
    expect(resetPasswordForEmailMock).not.toHaveBeenCalled();
  });

  // --- BAN 済みユーザーの復帰 ---
  it("BAN 済みユーザー（自社）を復帰させて success を返す", async () => {
    setupAuthenticatedOwner();
    inviteUserByEmailMock.mockResolvedValue({
      data: { user: null },
      error: { code: "email_exists", message: "email exists" },
    });
    updateUserByIdMock.mockResolvedValue({ data: {}, error: null });
    const adminChain = mockChain({
      data: { id: "banned-id", company_id: COMPANY_ID, is_active: false },
      error: null,
    });
    adminFromMock.mockReturnValue(adminChain);
    resetPasswordForEmailMock.mockResolvedValue({ error: null });

    const { inviteMemberAction } = await import(
      "@/features/company/app/members/actions/invite"
    );
    const result = await inviteMemberAction({}, validFormData());

    expect(result.success).toBe(true);
    expect(updateUserByIdMock).toHaveBeenCalledWith("banned-id", {
      ban_duration: "none",
      app_metadata: { role: "company_admin" },
    });
    expect(resetPasswordForEmailMock).toHaveBeenCalled();
  });

  it("既存メールが別企業所属の場合は復帰させずエラーを返す", async () => {
    setupAuthenticatedOwner();
    inviteUserByEmailMock.mockResolvedValue({
      data: { user: null },
      error: { code: "email_exists", message: "email exists" },
    });
    const adminChain = mockChain({
      data: {
        id: "other-company-user",
        company_id: "different-company-id",
        is_active: false,
      },
      error: null,
    });
    adminFromMock.mockReturnValue(adminChain);

    const { inviteMemberAction } = await import(
      "@/features/company/app/members/actions/invite"
    );
    const result = await inviteMemberAction({}, validFormData());

    expect(result.error).toBe("このメールアドレスは既に登録されています");
    // 他社ユーザーの ban 解除・パスワードリセットが一切実行されないこと
    expect(updateUserByIdMock).not.toHaveBeenCalled();
    expect(resetPasswordForEmailMock).not.toHaveBeenCalled();
  });

  it("自社BAN復帰のパスワードリセット送信に失敗した場合はエラーを返す", async () => {
    setupAuthenticatedOwner();
    inviteUserByEmailMock.mockResolvedValue({
      data: { user: null },
      error: { code: "email_exists", message: "email exists" },
    });
    updateUserByIdMock.mockResolvedValue({ data: {}, error: null });
    const adminChain = mockChain({
      data: { id: "banned-id", company_id: COMPANY_ID, is_active: false },
      error: null,
    });
    adminFromMock.mockReturnValue(adminChain);
    resetPasswordForEmailMock.mockResolvedValue({
      error: { message: "SMTP error" },
    });

    const { inviteMemberAction } = await import(
      "@/features/company/app/members/actions/invite"
    );
    const result = await inviteMemberAction({}, validFormData());

    expect(result.error).toBe("復帰メールの送信に失敗しました: SMTP error");
  });

  // --- 新規招待 ---
  it("新規ユーザーの招待が成功した場合は success を返す", async () => {
    setupAuthenticatedOwner();
    inviteUserByEmailMock.mockResolvedValue({
      data: { user: { id: "new-user-id" } },
      error: null,
    });
    updateUserByIdMock.mockResolvedValue({ data: {}, error: null });
    const adminInsertChain = mockChain({ data: null, error: null });
    adminFromMock.mockReturnValue(adminInsertChain);

    const { inviteMemberAction } = await import(
      "@/features/company/app/members/actions/invite"
    );
    const result = await inviteMemberAction({}, validFormData());

    expect(result.success).toBe(true);
    expect(inviteUserByEmailMock).toHaveBeenCalledWith("new@example.com", {
      data: expect.objectContaining({
        role: "admin",
        company_id: COMPANY_ID,
        inviter_name: "佐藤 花子",
        company_name: "テスト株式会社",
        invitee_name: "田中 太郎",
      }),
    });
  });

  it("inviteUserByEmail がエラーを返した場合はエラーを返す", async () => {
    setupAuthenticatedOwner();
    inviteUserByEmailMock.mockResolvedValue({
      data: { user: null },
      error: { message: "rate limited" },
    });

    const { inviteMemberAction } = await import(
      "@/features/company/app/members/actions/invite"
    );
    const result = await inviteMemberAction({}, validFormData());

    expect(result.error).toBe("招待に失敗しました: rate limited");
  });

  it("company_members への INSERT が失敗した場合はエラーを返す", async () => {
    setupAuthenticatedOwner();
    inviteUserByEmailMock.mockResolvedValue({
      data: { user: { id: "new-user-id" } },
      error: null,
    });
    updateUserByIdMock.mockResolvedValue({ data: {}, error: null });
    const adminInsertChain = mockChain({
      data: null,
      error: { message: "duplicate key" },
    });
    adminFromMock.mockReturnValue(adminInsertChain);

    const { inviteMemberAction } = await import(
      "@/features/company/app/members/actions/invite"
    );
    const result = await inviteMemberAction({}, validFormData());

    expect(result.error).toBe("メンバー登録に失敗しました: duplicate key");
  });
});
