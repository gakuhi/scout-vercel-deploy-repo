import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getUserMock = vi.fn();
const updateMock = vi.fn();
const upsertMock = vi.fn();
const getCompanyMembershipMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: getUserMock },
      from: vi.fn(() => ({
        update: updateMock.mockReturnValue({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        }),
        upsert: upsertMock,
      })),
    }),
  ),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: upsertMock,
    })),
  })),
}));

vi.mock("@/features/company/app/notifications/queries", () => ({
  getCompanyMembership: (...args: unknown[]) =>
    getCompanyMembershipMock(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("markNotificationReadAction", () => {
  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { markNotificationReadAction } = await import(
      "@/features/company/app/notifications/actions"
    );
    const result = await markNotificationReadAction("notif-1");
    expect(result.error).toBe("ログインし直してください");
  });

  it("正常に既読処理できた場合は success を返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { markNotificationReadAction } = await import(
      "@/features/company/app/notifications/actions"
    );
    const result = await markNotificationReadAction("notif-1");
    expect(result.success).toBe(true);
  });
});

describe("markAllNotificationsReadAction", () => {
  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { markAllNotificationsReadAction } = await import(
      "@/features/company/app/notifications/actions"
    );
    const result = await markAllNotificationsReadAction();
    expect(result.error).toBe("ログインし直してください");
  });

  it("正常に一括既読処理できた場合は success を返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { markAllNotificationsReadAction } = await import(
      "@/features/company/app/notifications/actions"
    );
    const result = await markAllNotificationsReadAction();
    expect(result.success).toBe(true);
  });
});

describe("saveNotificationSettingsAction", () => {
  it("未ログインの場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { saveNotificationSettingsAction } = await import(
      "@/features/company/app/notifications/actions"
    );
    const fd = new FormData();
    const result = await saveNotificationSettingsAction({}, fd);
    expect(result.error).toBe("ログインし直してください");
  });

  it("企業情報が見つからない場合はエラーを返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    getCompanyMembershipMock.mockResolvedValue(null);

    const { saveNotificationSettingsAction } = await import(
      "@/features/company/app/notifications/actions"
    );
    const fd = new FormData();
    const result = await saveNotificationSettingsAction({}, fd);
    expect(result.error).toBe("企業情報が見つかりません");
  });

  it("正常に保存できた場合は success を返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    getCompanyMembershipMock.mockResolvedValue({
      companyId: "company-1",
      role: "owner",
    });
    upsertMock.mockResolvedValue({ error: null });

    const { saveNotificationSettingsAction } = await import(
      "@/features/company/app/notifications/actions"
    );
    const fd = new FormData();
    fd.set("scoutAccepted", "on");
    fd.set("chatMessage", "on");
    fd.set("eventReminder", "on");
    fd.set("systemAnnouncement", "on");
    const result = await saveNotificationSettingsAction({}, fd);
    expect(result.success).toBe(true);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scout_accepted: true,
        chat_message: true,
        event_reminder: true,
        system_announcement: true,
      }),
      expect.anything(),
    );
    expect(upsertMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ scout_declined: expect.anything() }),
      expect.anything(),
    );
    expect(upsertMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ in_app_enabled: expect.anything() }),
      expect.anything(),
    );
    expect(upsertMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ email_enabled: expect.anything() }),
      expect.anything(),
    );
  });

  it("DB エラーの場合はエラーを返す（メッセージ隠蔽）", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    getCompanyMembershipMock.mockResolvedValue({
      companyId: "company-1",
      role: "owner",
    });
    upsertMock.mockResolvedValue({ error: { message: "constraint" } });

    const { saveNotificationSettingsAction } = await import(
      "@/features/company/app/notifications/actions"
    );
    const fd = new FormData();
    const result = await saveNotificationSettingsAction({}, fd);
    expect(result.error).toBe("通知設定の保存に失敗しました");
    expect(result.error).not.toContain("constraint");
  });
});
