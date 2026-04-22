import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Supabase client mock ---
const getUserMock = vi.fn();
const createClientMock = vi.fn(() => ({
  auth: { getUser: getUserMock },
}));

// --- Supabase admin mock ---
const updateUserByIdMock = vi.fn();
const adminFromMock = vi.fn();
const createAdminClientMock = vi.fn(() => ({
  auth: { admin: { updateUserById: updateUserByIdMock } },
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
const TARGET_MEMBER_ID = "member-id-1";

/** supabaseFromMock のチェーン用ヘルパー */
function mockChain(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "insert", "update", "delete", "eq", "neq", "in", "order", "limit"];
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
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("deleteMemberAction", () => {
  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { deleteMemberAction } = await import(
      "@/features/company/app/members/actions/delete"
    );
    const result = await deleteMemberAction(TARGET_MEMBER_ID);
    expect(result.error).toBe("ログインし直してください");
  });

  it("企業情報が見つからない場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: OWNER_ID } },
    });
    getCompanyIdForUserMock.mockResolvedValue(null);
    getCurrentUserRoleMock.mockResolvedValue("owner");
    const { deleteMemberAction } = await import(
      "@/features/company/app/members/actions/delete"
    );
    const result = await deleteMemberAction(TARGET_MEMBER_ID);
    expect(result.error).toBe("企業情報が見つかりません");
  });

  it("owner 以外のロールの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: OWNER_ID } },
    });
    getCompanyIdForUserMock.mockResolvedValue(COMPANY_ID);
    getCurrentUserRoleMock.mockResolvedValue("admin");
    const { deleteMemberAction } = await import(
      "@/features/company/app/members/actions/delete"
    );
    const result = await deleteMemberAction(TARGET_MEMBER_ID);
    expect(result.error).toBe("この操作は企業オーナーのみ実行できます");
  });

  it("自分自身を無効化しようとした場合はエラーを返す", async () => {
    setupAuthenticatedOwner();
    const { deleteMemberAction } = await import(
      "@/features/company/app/members/actions/delete"
    );
    const result = await deleteMemberAction(OWNER_ID);
    expect(result.error).toBe("自分自身を無効化することはできません");
  });

  it("BAN 処理が成功した場合は success を返す", async () => {
    setupAuthenticatedOwner();
    updateUserByIdMock.mockResolvedValue({ error: null });
    const updateChain = mockChain({ data: null, error: null });
    adminFromMock.mockReturnValue(updateChain);

    const { deleteMemberAction } = await import(
      "@/features/company/app/members/actions/delete"
    );
    const result = await deleteMemberAction(TARGET_MEMBER_ID);

    expect(result.success).toBe(true);
    expect(updateUserByIdMock).toHaveBeenCalledWith(TARGET_MEMBER_ID, {
      ban_duration: "876000h",
    });
  });

  it("BAN 処理が失敗した場合はエラーを返す", async () => {
    setupAuthenticatedOwner();
    updateUserByIdMock.mockResolvedValue({
      error: { message: "user not found" },
    });

    const { deleteMemberAction } = await import(
      "@/features/company/app/members/actions/delete"
    );
    const result = await deleteMemberAction(TARGET_MEMBER_ID);

    expect(result.error).toBe(
      "メンバーの無効化に失敗しました: user not found",
    );
  });
});
