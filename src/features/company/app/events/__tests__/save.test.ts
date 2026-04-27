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

function buildFormData(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    fd.set(key, value);
  }
  return fd;
}

function validEventForm(overrides: Record<string, string> = {}): FormData {
  return buildFormData({
    title: "テスト説明会",
    eventType: "会社説明会",
    format: "offline",
    startsAt: "2025-06-01T10:00",
    endsAt: "2025-06-01T12:00",
    location: "東京都",
    onlineUrl: "",
    description: "テストイベントです",
    capacity: "50",
    applicationDeadline: "2025-05-25",
    targetGraduationYear: "2027",
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

describe("createEventAction", () => {
  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { createEventAction } = await import(
      "@/features/company/app/events/actions/save"
    );
    const result = await createEventAction({}, validEventForm());
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

    const { createEventAction } = await import(
      "@/features/company/app/events/actions/save"
    );
    const result = await createEventAction({}, validEventForm());
    expect(result.error).toBe(
      "イベントの作成は企業オーナーまたは管理者のみ実行できます",
    );
  });

  it("タイトルが空の場合はバリデーションエラーを返す", async () => {
    setupOwner();

    const { createEventAction } = await import(
      "@/features/company/app/events/actions/save"
    );
    const result = await createEventAction(
      {},
      validEventForm({ title: "" }),
    );
    expect(result.error).toBe("イベント名を入力してください");
  });

  it("不正なカテゴリの場合はバリデーションエラーを返す", async () => {
    setupOwner();

    const { createEventAction } = await import(
      "@/features/company/app/events/actions/save"
    );
    const result = await createEventAction(
      {},
      validEventForm({ eventType: "不正" }),
    );
    expect(result.error).toBe("有効なカテゴリを選択してください");
  });

  it("下書き保存が成功した場合は success を返す", async () => {
    setupOwner();
    fromMock.mockReturnValue(
      mockInsertChain({ data: { id: "event-1" }, error: null }),
    );

    const { createEventAction } = await import(
      "@/features/company/app/events/actions/save"
    );
    const result = await createEventAction({}, validEventForm());

    expect(result.success).toBe(true);
    expect(result.eventId).toBe("event-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/company/events");
  });

  it("公開保存の場合は is_published=true で作成される", async () => {
    setupOwner();
    const chain = mockInsertChain({ data: { id: "event-2" }, error: null });
    fromMock.mockReturnValue(chain);

    const { createEventAction } = await import(
      "@/features/company/app/events/actions/save"
    );
    const result = await createEventAction(
      {},
      validEventForm({ action: "publish" }),
    );

    expect(result.success).toBe(true);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_published: true }),
    );
  });

  it("INSERT が失敗した場合はエラーを返す（DBエラーは隠蔽）", async () => {
    setupOwner();
    fromMock.mockReturnValue(
      mockInsertChain({ data: null, error: { message: "constraint" } }),
    );

    const { createEventAction } = await import(
      "@/features/company/app/events/actions/save"
    );
    const result = await createEventAction({}, validEventForm());

    expect(result.error).toBe("イベントの作成に失敗しました");
    expect(result.error).not.toContain("constraint");
  });
});

describe("updateEventAction", () => {
  it("eventId がない場合はエラーを返す", async () => {
    const { updateEventAction } = await import(
      "@/features/company/app/events/actions/save"
    );
    const result = await updateEventAction({}, validEventForm());
    expect(result.error).toBe("イベントIDが不正です");
  });

  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { updateEventAction } = await import(
      "@/features/company/app/events/actions/save"
    );
    const fd = validEventForm();
    fd.set("eventId", "11111111-1111-1111-1111-111111111111");
    const result = await updateEventAction({}, fd);
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

    const { updateEventAction } = await import(
      "@/features/company/app/events/actions/save"
    );
    const fd = validEventForm();
    fd.set("eventId", "11111111-1111-1111-1111-111111111111");
    const result = await updateEventAction({}, fd);
    expect(result.error).toBe(
      "イベントの編集は企業オーナーまたは管理者のみ実行できます",
    );
  });
});
