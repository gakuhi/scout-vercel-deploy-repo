import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getUserMock = vi.fn();
const getCompanyMembershipMock = vi.fn();
const getAlreadyScoutedStudentIdsMock = vi.fn();
const insertMock = vi.fn();
const rpcMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: getUserMock },
      from: vi.fn(() => ({
        insert: insertMock,
      })),
    }),
  ),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    rpc: rpcMock,
  })),
}));

vi.mock("@/features/company/app/scouts/queries", () => ({
  getCompanyMembership: (...args: unknown[]) =>
    getCompanyMembershipMock(...args),
  getAlreadyScoutedStudentIds: (...args: unknown[]) =>
    getAlreadyScoutedStudentIdsMock(...args),
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

function validScoutForm(
  overrides: Record<string, string | string[]> = {},
): FormData {
  return buildFormData({
    subject: "特別選考のご案内",
    message: "ぜひ弊社の選考にご参加ください。",
    jobPostingId: "job-1",
    studentIds: ["student-1", "student-2"],
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

describe("sendScoutAction", () => {
  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { sendScoutAction } = await import(
      "@/features/company/app/scouts/actions"
    );
    const result = await sendScoutAction({}, validScoutForm());
    expect(result.error).toBe("ログインし直してください");
  });

  it("件名が空の場合はバリデーションエラーを返す", async () => {
    setupOwner();

    const { sendScoutAction } = await import(
      "@/features/company/app/scouts/actions"
    );
    const result = await sendScoutAction(
      {},
      validScoutForm({ subject: "" }),
    );
    expect(result.error).toBe("件名を入力してください");
  });

  it("全員が送信済みの場合はエラーを返す", async () => {
    setupOwner();
    getAlreadyScoutedStudentIdsMock.mockResolvedValue([
      "student-1",
      "student-2",
    ]);

    const { sendScoutAction } = await import(
      "@/features/company/app/scouts/actions"
    );
    const result = await sendScoutAction({}, validScoutForm());
    expect(result.error).toBe(
      "選択した学生には既にスカウトを送信済みです",
    );
  });

  it("月間上限に達している場合はエラーを返す", async () => {
    setupOwner();
    getAlreadyScoutedStudentIdsMock.mockResolvedValue([]);
    rpcMock.mockResolvedValue({
      data: { success: false, error: "limit_reached", remaining: 0 },
      error: null,
    });

    const { sendScoutAction } = await import(
      "@/features/company/app/scouts/actions"
    );
    const result = await sendScoutAction({}, validScoutForm());
    expect(result.error).toBe(
      "今月のスカウト送信上限（30通）に達しています",
    );
  });

  it("選択人数が残り枠を超える場合はエラーを返す", async () => {
    setupOwner();
    getAlreadyScoutedStudentIdsMock.mockResolvedValue([]);
    rpcMock.mockResolvedValue({
      data: { success: false, error: "limit_exceeded", remaining: 1 },
      error: null,
    });

    const { sendScoutAction } = await import(
      "@/features/company/app/scouts/actions"
    );
    const result = await sendScoutAction({}, validScoutForm());
    expect(result.error).toBe(
      "今月の残り送信可能数は1通です（2人選択中）",
    );
  });

  it("RPC がエラーの場合はエラーを返す（DBエラー隠蔽）", async () => {
    setupOwner();
    getAlreadyScoutedStudentIdsMock.mockResolvedValue([]);
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "internal error" },
    });

    const { sendScoutAction } = await import(
      "@/features/company/app/scouts/actions"
    );
    const result = await sendScoutAction({}, validScoutForm());
    expect(result.error).toBe("スカウトの送信に失敗しました");
    expect(result.error).not.toContain("internal");
  });

  it("正常に送信できた場合は success を返す", async () => {
    setupOwner();
    getAlreadyScoutedStudentIdsMock.mockResolvedValue([]);
    rpcMock.mockResolvedValue({
      data: { success: true, remaining: 28 },
      error: null,
    });
    insertMock.mockResolvedValue({ error: null });

    const { sendScoutAction } = await import(
      "@/features/company/app/scouts/actions"
    );
    const result = await sendScoutAction({}, validScoutForm());

    expect(result.success).toBe(true);
    expect(result.sentCount).toBe(2);
    expect(result.skippedCount).toBe(0);
  });

  it("一部が送信済みの場合は未送信分のみ送信する", async () => {
    setupOwner();
    getAlreadyScoutedStudentIdsMock.mockResolvedValue(["student-1"]);
    rpcMock.mockResolvedValue({
      data: { success: true, remaining: 29 },
      error: null,
    });
    insertMock.mockResolvedValue({ error: null });

    const { sendScoutAction } = await import(
      "@/features/company/app/scouts/actions"
    );
    const result = await sendScoutAction({}, validScoutForm());

    expect(result.success).toBe(true);
    expect(result.sentCount).toBe(1);
    expect(result.skippedCount).toBe(1);
  });

  it("INSERT が失敗した場合はエラーを返す（DBエラー隠蔽）", async () => {
    setupOwner();
    getAlreadyScoutedStudentIdsMock.mockResolvedValue([]);
    rpcMock.mockResolvedValue({
      data: { success: true, remaining: 28 },
      error: null,
    });
    insertMock.mockResolvedValue({ error: { message: "FK violation" } });

    const { sendScoutAction } = await import(
      "@/features/company/app/scouts/actions"
    );
    const result = await sendScoutAction({}, validScoutForm());

    expect(result.error).toBe("スカウトの送信に失敗しました");
    expect(result.error).not.toContain("FK");
  });

  it("admin ロールでも送信できる", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-2" } },
    });
    getCompanyMembershipMock.mockResolvedValue({
      companyId: "company-1",
      role: "admin",
    });
    getAlreadyScoutedStudentIdsMock.mockResolvedValue([]);
    rpcMock.mockResolvedValue({
      data: { success: true, remaining: 28 },
      error: null,
    });
    insertMock.mockResolvedValue({ error: null });

    const { sendScoutAction } = await import(
      "@/features/company/app/scouts/actions"
    );
    const result = await sendScoutAction({}, validScoutForm());

    expect(result.success).toBe(true);
  });
});
