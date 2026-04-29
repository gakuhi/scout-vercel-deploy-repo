import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let settingsResult: { data: Record<string, unknown> | null } = { data: null };
const insertMock = vi.fn();
const selectEmailMock = vi.fn();
const resendSendMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "company_notification_settings") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve(settingsResult)),
            })),
          })),
        };
      }
      if (table === "notifications") {
        return { insert: insertMock };
      }
      if (table === "company_members") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: selectEmailMock,
            })),
          })),
        };
      }
      return {};
    }),
  })),
}));

vi.mock("@/lib/resend/client", () => ({
  getResend: vi.fn(() => ({
    emails: { send: resendSendMock },
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  settingsResult = { data: null };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createNotification", () => {
  it("設定がない場合は種別フラグのデフォルト ON でアプリ内 INSERT + メール送信を実行する", async () => {
    settingsResult = { data: null };
    insertMock.mockResolvedValue({ error: null });
    selectEmailMock.mockResolvedValue({ data: { email: "test@example.com" } });
    resendSendMock.mockResolvedValue({ error: null });

    const { createNotification } = await import(
      "@/features/company/app/notifications/create"
    );
    const result = await createNotification({
      userId: "user-1",
      type: "chat_new_message",
      title: "テスト通知",
    });

    expect(result.created).toBe(true);
    expect(result.emailSent).toBe(true);
    expect(insertMock).toHaveBeenCalled();
    expect(resendSendMock).toHaveBeenCalled();
  });

  it("種別フラグ OFF の場合でもアプリ内 INSERT は実行され、メール送信のみスキップされる", async () => {
    settingsResult = { data: { chat_message: false } };
    insertMock.mockResolvedValue({ error: null });

    const { createNotification } = await import(
      "@/features/company/app/notifications/create"
    );
    const result = await createNotification({
      userId: "user-1",
      type: "chat_new_message",
      title: "テスト通知",
    });

    expect(result.created).toBe(true);
    expect(result.emailSent).toBe(false);
    expect(insertMock).toHaveBeenCalled();
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("種別フラグ ON + メールアドレスありの場合はアプリ内 INSERT + メール送信を実行する", async () => {
    settingsResult = { data: { scout_accepted: true } };
    insertMock.mockResolvedValue({ error: null });
    selectEmailMock.mockResolvedValue({ data: { email: "test@example.com" } });
    resendSendMock.mockResolvedValue({ error: null });

    const { createNotification } = await import(
      "@/features/company/app/notifications/create"
    );
    const result = await createNotification({
      userId: "user-1",
      type: "scout_accepted",
      title: "スカウト承諾",
      body: "テスト",
    });

    expect(result.created).toBe(true);
    expect(result.emailSent).toBe(true);
    expect(insertMock).toHaveBeenCalled();
    expect(resendSendMock).toHaveBeenCalled();
  });

  it("INSERT が失敗した場合はエラーを返す", async () => {
    settingsResult = { data: null };
    insertMock.mockResolvedValue({ error: { message: "DB error" } });

    const { createNotification } = await import(
      "@/features/company/app/notifications/create"
    );
    const result = await createNotification({
      userId: "user-1",
      type: "chat_new_message",
      title: "テスト通知",
    });

    expect(result.created).toBe(false);
    expect(result.error).toBe("通知の作成に失敗しました");
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("メール送信が失敗してもアプリ内 INSERT は成功扱いになる", async () => {
    settingsResult = { data: { scout_accepted: true } };
    insertMock.mockResolvedValue({ error: null });
    selectEmailMock.mockResolvedValue({ data: { email: "test@example.com" } });
    resendSendMock.mockResolvedValue({ error: { message: "SMTP error" } });

    const { createNotification } = await import(
      "@/features/company/app/notifications/create"
    );
    const result = await createNotification({
      userId: "user-1",
      type: "scout_accepted",
      title: "スカウト承諾",
    });

    expect(result.created).toBe(true);
    expect(result.emailSent).toBe(false);
  });

  it("種別フラグ ON だがメールアドレスがない場合はアプリ内 INSERT のみ", async () => {
    settingsResult = { data: { scout_accepted: true } };
    insertMock.mockResolvedValue({ error: null });
    selectEmailMock.mockResolvedValue({ data: null });

    const { createNotification } = await import(
      "@/features/company/app/notifications/create"
    );
    const result = await createNotification({
      userId: "user-1",
      type: "scout_accepted",
      title: "テスト通知",
    });

    expect(result.created).toBe(true);
    expect(result.emailSent).toBe(false);
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("scout_received は企業設定マップに含まれないためメール送信はされず、アプリ内 INSERT のみ実行される", async () => {
    settingsResult = { data: null };
    insertMock.mockResolvedValue({ error: null });

    const { createNotification } = await import(
      "@/features/company/app/notifications/create"
    );
    const result = await createNotification({
      userId: "user-1",
      type: "scout_received",
      title: "スカウト受信",
    });

    expect(result.created).toBe(true);
    expect(result.emailSent).toBe(false);
    expect(insertMock).toHaveBeenCalled();
    expect(resendSendMock).not.toHaveBeenCalled();
  });
});

// --- ヘルパー関数のテスト ---

describe("notifyScoutAccepted", () => {
  it("scout_accepted タイプで通知を作成する", async () => {
    settingsResult = { data: null };
    insertMock.mockResolvedValue({ error: null });
    selectEmailMock.mockResolvedValue({ data: null });

    const { notifyScoutAccepted } = await import(
      "@/features/company/app/notifications/create"
    );
    const result = await notifyScoutAccepted({
      senderId: "sender-1",
      studentName: "田中太郎",
      jobTitle: "エンジニア職",
      scoutId: "scout-1",
    });

    expect(result.created).toBe(true);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "sender-1",
        type: "scout_accepted",
        reference_type: "scouts",
        reference_id: "scout-1",
      }),
    );
  });
});

describe("notifyChatMessage", () => {
  it("チャット新着通知を作成する", async () => {
    settingsResult = { data: null };
    insertMock.mockResolvedValue({ error: null });
    selectEmailMock.mockResolvedValue({ data: null });

    const { notifyChatMessage } = await import(
      "@/features/company/app/notifications/create"
    );
    const result = await notifyChatMessage({
      senderId: "sender-1",
      studentName: "佐藤健太",
      messagePreview: "選考について相談させてください",
      scoutId: "scout-1",
    });

    expect(result.created).toBe(true);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "sender-1",
        type: "chat_new_message",
        reference_type: "scouts",
      }),
    );
  });
});

describe("notifyEventReminder", () => {
  it("イベントリマインダー通知を作成する", async () => {
    settingsResult = { data: null };
    insertMock.mockResolvedValue({ error: null });
    selectEmailMock.mockResolvedValue({ data: null });

    const { notifyEventReminder } = await import(
      "@/features/company/app/notifications/create"
    );
    const result = await notifyEventReminder({
      createdBy: "creator-1",
      eventTitle: "会社説明会 2026",
      eventId: "event-1",
    });

    expect(result.created).toBe(true);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "creator-1",
        type: "event_reminder",
        reference_type: "events",
        reference_id: "event-1",
      }),
    );
  });
});
