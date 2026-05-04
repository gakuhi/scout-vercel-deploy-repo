import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const notifyMock = vi.fn();
const requireCronAuthMock = vi.fn();
const selectMock = vi.fn();
const ltMock = vi.fn(() => selectMock());
const gteMock = vi.fn(() => ({ lt: ltMock }));
const isMock = vi.fn(() => ({ gte: gteMock }));
const eqMock = vi.fn(() => ({ is: isMock }));
const fromSelectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: fromSelectMock }));

vi.mock("@/features/notification", () => ({
  notify: (...args: unknown[]) => notifyMock(...args),
}));

vi.mock("@/lib/sync/shared", () => ({
  requireCronAuth: (...args: unknown[]) => requireCronAuthMock(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: fromMock })),
}));

function buildRequest(): Request {
  return new Request("http://localhost/api/cron/event-reminder", {
    headers: { Authorization: "Bearer test-secret" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireCronAuthMock.mockReturnValue(null); // 認証OK
  notifyMock.mockResolvedValue({ lineSent: false, emailSent: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/cron/event-reminder", () => {
  it("認証失敗時はエラーレスポンスを返す", async () => {
    const errorResponse = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    requireCronAuthMock.mockReturnValue(errorResponse);

    const { GET } = await import("../route");
    const res = await GET(buildRequest());

    expect(res.status).toBe(401);
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("対象イベントがない場合は notified: 0 を返す", async () => {
    selectMock.mockResolvedValue({ data: [], error: null });

    const { GET } = await import("../route");
    const res = await GET(buildRequest());
    const body = await res.json();

    expect(body.notified).toBe(0);
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("DB検索エラー時は 500 を返す", async () => {
    selectMock.mockResolvedValue({ data: null, error: { message: "db error" } });

    const { GET } = await import("../route");
    const res = await GET(buildRequest());

    expect(res.status).toBe(500);
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("対象イベントごとに notify() を呼ぶ", async () => {
    selectMock.mockResolvedValue({
      data: [
        { id: "event-1", title: "説明会A", created_by: "member-1" },
        { id: "event-2", title: "説明会B", created_by: "member-2" },
      ],
      error: null,
    });

    const { GET } = await import("../route");
    const res = await GET(buildRequest());
    const body = await res.json();

    expect(body.notified).toBe(2);
    expect(notifyMock).toHaveBeenCalledTimes(2);
    expect(notifyMock).toHaveBeenCalledWith({
      userId: "member-1",
      recipientRole: "company_member",
      type: "event_reminder",
      title: "イベント開催まであと1日です",
      body: "「説明会A」が明日開催されます。",
      referenceType: "events",
      referenceId: "event-1",
    });
  });

  it("notify() 失敗時はエラーを記録しつつ処理を続行する", async () => {
    selectMock.mockResolvedValue({
      data: [
        { id: "event-1", title: "説明会A", created_by: "member-1" },
        { id: "event-2", title: "説明会B", created_by: "member-2" },
      ],
      error: null,
    });
    notifyMock
      .mockRejectedValueOnce(new Error("notify failed"))
      .mockResolvedValueOnce({ lineSent: false, emailSent: true });

    const { GET } = await import("../route");
    const res = await GET(buildRequest());
    const body = await res.json();

    expect(body.notified).toBe(1);
    expect(body.total).toBe(2);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]).toContain("event-1");
  });
});
