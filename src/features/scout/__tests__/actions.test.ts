import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// クエリビルダのチェーン全体を1回の呼び出しで終端させるための共通モック。
// .from(...).update(...).eq(...).eq(...).eq(...).or(...).select(...) が
// すべて同じ instance を返し、最後の .select() が { data, error } を返す。
type SelectResult = {
  data: Array<{
    id: string;
    sender_id: string;
    students: { last_name: string | null; first_name: string | null } | null;
  }> | null;
  error: { message: string } | null;
};

const selectMock = vi.fn<() => Promise<SelectResult>>();
const orMock = vi.fn();
const eqStatusMock = vi.fn();
const eqStudentMock = vi.fn();
const eqIdMock = vi.fn();
const updateMock = vi.fn();
const fromMock = vi.fn();
const getUserMock = vi.fn();
const revalidatePathMock = vi.fn();
const createNotificationMock = vi.fn();

const createClientMock = vi.fn(async () => ({
  auth: { getUser: getUserMock },
  from: fromMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/features/company/app/notifications/create", () => ({
  createNotification: createNotificationMock,
}));

function chainResolves(result: SelectResult) {
  selectMock.mockResolvedValueOnce(result);
  // 各 mock が同じ chainable を返すように都度繋ぎ直す。
  orMock.mockReturnValueOnce({ select: selectMock });
  eqStatusMock.mockReturnValueOnce({ or: orMock });
  eqStudentMock.mockReturnValueOnce({ eq: eqStatusMock });
  eqIdMock.mockReturnValueOnce({ eq: eqStudentMock });
  updateMock.mockReturnValueOnce({ eq: eqIdMock });
  fromMock.mockReturnValueOnce({ update: updateMock });
}

function buildFormData(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    fd.set(key, value);
  }
  return fd;
}

beforeEach(() => {
  selectMock.mockReset();
  orMock.mockReset();
  eqStatusMock.mockReset();
  eqStudentMock.mockReset();
  eqIdMock.mockReset();
  updateMock.mockReset();
  fromMock.mockReset();
  getUserMock.mockReset();
  revalidatePathMock.mockClear();
  createNotificationMock.mockReset();
  createNotificationMock.mockResolvedValue({ created: true });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("acceptScout / declineScout", () => {
  it("scout_id が FormData に無い場合は validation エラーを返す", async () => {
    const { acceptScout } = await import("../actions");
    const result = await acceptScout({}, buildFormData({}));
    expect(result.error).toBe("不正なリクエストです");
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("未ログインなら認証エラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { acceptScout } = await import("../actions");
    const result = await acceptScout(
      {},
      buildFormData({ scout_id: "scout-1" }),
    );
    expect(result.error).toBe("認証エラー");
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("status='sent' でない / 期限切れでヒット 0 件なら遷移不能エラー", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "student-1" } },
    });
    chainResolves({ data: [], error: null });

    const { acceptScout } = await import("../actions");
    const result = await acceptScout(
      {},
      buildFormData({ scout_id: "scout-1" }),
    );

    expect(result.error).toMatch(/対応済みか期限切れ/);
    expect(updateMock).toHaveBeenCalledWith({
      status: "accepted",
      responded_at: expect.any(String),
    });
    expect(eqStatusMock).toHaveBeenCalledWith("status", "sent");
    expect(orMock).toHaveBeenCalledWith(
      expect.stringMatching(/expires_at\.is\.null,expires_at\.gt\./),
    );
    expect(createNotificationMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("supabase エラーなら承諾失敗メッセージを返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "student-1" } },
    });
    chainResolves({ data: null, error: { message: "db down" } });

    const { acceptScout } = await import("../actions");
    const result = await acceptScout(
      {},
      buildFormData({ scout_id: "scout-1" }),
    );

    expect(result.error).toBe("承諾に失敗しました");
    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  it("declineScout の supabase エラーは辞退失敗メッセージを返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "student-1" } },
    });
    chainResolves({ data: null, error: { message: "db down" } });

    const { declineScout } = await import("../actions");
    const result = await declineScout(
      {},
      buildFormData({ scout_id: "scout-1" }),
    );

    expect(result.error).toBe("辞退に失敗しました");
  });

  it("成功時は success を返し、企業に通知 + revalidatePath が走る", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "student-1" } },
    });
    chainResolves({
      data: [
        {
          id: "scout-1",
          sender_id: "company-member-1",
          students: { last_name: "山田", first_name: "太郎" },
        },
      ],
      error: null,
    });

    const { acceptScout } = await import("../actions");
    const result = await acceptScout(
      {},
      buildFormData({ scout_id: "scout-1" }),
    );

    expect(result.success).toBe(true);
    expect(createNotificationMock).toHaveBeenCalledWith({
      userId: "company-member-1",
      type: "scout_accepted",
      title: "山田 太郎さんがスカウトを承諾しました",
      referenceType: "scouts",
      referenceId: "scout-1",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/student/scout");
  });

  it("通知作成が失敗しても遷移自体は成功扱いを維持する", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "student-1" } },
    });
    chainResolves({
      data: [
        {
          id: "scout-1",
          sender_id: "company-member-1",
          students: null,
        },
      ],
      error: null,
    });
    createNotificationMock.mockRejectedValue(new Error("notify failed"));

    const { declineScout } = await import("../actions");
    const result = await declineScout(
      {},
      buildFormData({ scout_id: "scout-1" }),
    );

    expect(result.success).toBe(true);
    // 学生名が取れない場合は "学生" にフォールバック
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "scout_declined",
        title: "学生さんがスカウトを辞退しました",
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/student/scout");
  });

  it("expires_at の OR 条件は呼び出し時点の ISO now を含む", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "student-1" } },
    });
    chainResolves({ data: [], error: null });

    const before = new Date().toISOString();
    const { acceptScout } = await import("../actions");
    await acceptScout({}, buildFormData({ scout_id: "scout-1" }));
    const after = new Date().toISOString();

    const orArg = orMock.mock.calls[0][0] as string;
    const m = orArg.match(/expires_at\.gt\.(.+)$/);
    expect(m).not.toBeNull();
    const usedNow = m![1];
    expect(usedNow >= before && usedNow <= after).toBe(true);
  });
});
