import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const fromMock = vi.fn();
const createClientMock = vi.fn(() => ({
  auth: { getUser: getUserMock },
  from: fromMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));
vi.mock("server-only", () => ({}));

function mockChain(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "neq", "in", "order", "limit"];
  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(() => Promise.resolve(resolvedValue));
  chain.then = (resolve: (v: unknown) => void) => resolve(resolvedValue);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getSidebarUser", () => {
  it("未ログインの場合は undefined を返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { getSidebarUser } = await import(
      "@/features/company/components/queries"
    );
    const result = await getSidebarUser();
    expect(result).toBeUndefined();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("company_members にデータがない場合は undefined を返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
    });
    fromMock.mockReturnValue(
      mockChain({ data: null, error: null }),
    );
    const { getSidebarUser } = await import(
      "@/features/company/components/queries"
    );
    const result = await getSidebarUser();
    expect(result).toBeUndefined();
  });

  it("姓名がある場合はフルネームを返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
    });
    fromMock.mockReturnValue(
      mockChain({
        data: { last_name: "鈴木", first_name: "一郎", role: "owner" },
        error: null,
      }),
    );
    const { getSidebarUser } = await import(
      "@/features/company/components/queries"
    );
    const result = await getSidebarUser();
    expect(result).toEqual({ name: "鈴木 一郎", role: "owner" });
  });

  it("姓のみの場合は姓だけを返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
    });
    fromMock.mockReturnValue(
      mockChain({
        data: { last_name: "鈴木", first_name: null, role: "admin" },
        error: null,
      }),
    );
    const { getSidebarUser } = await import(
      "@/features/company/components/queries"
    );
    const result = await getSidebarUser();
    expect(result).toEqual({ name: "鈴木", role: "admin" });
  });

  it("姓名がどちらも空の場合はメールアドレスをフォールバックする", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "fallback@example.com" } },
    });
    fromMock.mockReturnValue(
      mockChain({
        data: { last_name: null, first_name: null, role: "member" },
        error: null,
      }),
    );
    const { getSidebarUser } = await import(
      "@/features/company/components/queries"
    );
    const result = await getSidebarUser();
    expect(result).toEqual({ name: "fallback@example.com", role: "member" });
  });

  it("ロールが null の場合は member をデフォルトにする", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
    });
    fromMock.mockReturnValue(
      mockChain({
        data: { last_name: "田中", first_name: "太郎", role: null },
        error: null,
      }),
    );
    const { getSidebarUser } = await import(
      "@/features/company/components/queries"
    );
    const result = await getSidebarUser();
    expect(result).toEqual({ name: "田中 太郎", role: "member" });
  });
});
