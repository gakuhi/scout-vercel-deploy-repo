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

vi.mock("@/features/company/app/events/queries", () => ({
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

function mockSelectThenUpdateChain(
  selectResult: { data: unknown; error: unknown },
  updateResult: { data: unknown; error: unknown },
) {
  let callCount = 0;
  return {
    select: vi.fn(() => {
      const chain: Record<string, unknown> = {};
      for (const m of ["eq", "is"]) {
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

describe("toggleEventPublishAction", () => {
  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { toggleEventPublishAction } = await import(
      "@/features/company/app/events/actions/toggle-publish"
    );
    const result = await toggleEventPublishAction("11111111-1111-1111-1111-111111111111", true);
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

    const { toggleEventPublishAction } = await import(
      "@/features/company/app/events/actions/toggle-publish"
    );
    const result = await toggleEventPublishAction("11111111-1111-1111-1111-111111111111", true);
    expect(result.error).toBe(
      "この操作は企業オーナーまたは管理者のみ実行できます",
    );
  });

  it("イベントが見つからない場合はエラーを返す", async () => {
    setupOwner();
    fromMock.mockReturnValue(
      mockSelectThenUpdateChain(
        { data: null, error: null },
        { data: null, error: null },
      ),
    );

    const { toggleEventPublishAction } = await import(
      "@/features/company/app/events/actions/toggle-publish"
    );
    const result = await toggleEventPublishAction("22222222-2222-2222-2222-222222222222", true);
    expect(result.error).toBe("イベントが見つかりません");
  });

  it("公開に切り替えが成功した場合は success を返す", async () => {
    setupOwner();
    fromMock.mockReturnValue(
      mockSelectThenUpdateChain(
        { data: { id: "11111111-1111-1111-1111-111111111111", published_at: null }, error: null },
        { data: null, error: null },
      ),
    );

    const { toggleEventPublishAction } = await import(
      "@/features/company/app/events/actions/toggle-publish"
    );
    const result = await toggleEventPublishAction("11111111-1111-1111-1111-111111111111", true);
    expect(result.success).toBe(true);
    expect(revalidatePathMock).toHaveBeenCalledWith("/company/events");
  });
});

describe("deleteEventAction", () => {
  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { deleteEventAction } = await import(
      "@/features/company/app/events/actions/toggle-publish"
    );
    const result = await deleteEventAction("11111111-1111-1111-1111-111111111111");
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

    const { deleteEventAction } = await import(
      "@/features/company/app/events/actions/toggle-publish"
    );
    const result = await deleteEventAction("11111111-1111-1111-1111-111111111111");
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

    const { deleteEventAction } = await import(
      "@/features/company/app/events/actions/toggle-publish"
    );
    const result = await deleteEventAction("11111111-1111-1111-1111-111111111111");
    expect(result.success).toBe(true);
    expect(revalidatePathMock).toHaveBeenCalledWith("/company/events");
  });
});
