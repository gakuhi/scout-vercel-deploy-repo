import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * notify() の end-to-end（Supabase admin + LINE push + Email 送信をモックした単体）テスト。
 *
 * Supabase admin client は:
 *   - from("student_notification_settings") / from("company_notification_settings") の select
 *   - from("notifications") の insert / update
 *   - from("line_friendships") の select（学生の LINE user_id 解決）
 *   - from("company_members") の select（企業担当者のメールアドレス解決）
 * を呼ぶので、それぞれの戻り値を差し替えられる小さな fake を用意する。
 */

// ---------------------------------------------------------------
// 依存 mock
// ---------------------------------------------------------------

const pushLineMessageMock = vi.fn();
vi.mock("@/lib/line/messaging", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/line/messaging")>(
      "@/lib/line/messaging",
    );
  return {
    ...actual,
    pushLineMessage: (...args: unknown[]) => pushLineMessageMock(...args),
  };
});

const sendNotificationEmailMock = vi.fn();
vi.mock("@/lib/email/notification", () => ({
  sendNotificationEmail: (...args: unknown[]) =>
    sendNotificationEmailMock(...args),
}));

type SelectResult = {
  data: unknown;
  error: { message: string } | null;
};

let studentSettingsResult: SelectResult = { data: null, error: null };
let companySettingsResult: SelectResult = { data: null, error: null };
let lineFriendshipResult: SelectResult = { data: null, error: null };
let companyMemberResult: SelectResult = { data: null, error: null };
let insertNotificationResult: { data: unknown; error: { message: string } | null } = {
  data: { id: "notif-id-1" },
  error: null,
};
let updateNotificationResult: { error: { message: string } | null } = {
  error: null,
};

const insertPayloads: unknown[] = [];
const updatePayloads: Array<{ id: string; patch: Record<string, unknown> }> = [];

function makeAdminFake() {
  return {
    from(table: string) {
      if (table === "student_notification_settings") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve(studentSettingsResult),
            }),
          }),
        };
      }
      if (table === "company_notification_settings") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve(companySettingsResult),
            }),
          }),
        };
      }
      if (table === "line_friendships") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve(lineFriendshipResult),
              }),
            }),
          }),
        };
      }
      if (table === "company_members") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve(companyMemberResult),
            }),
          }),
        };
      }
      if (table === "notifications") {
        return {
          insert: (payload: unknown) => {
            insertPayloads.push(payload);
            return {
              select: () => ({
                single: () => Promise.resolve(insertNotificationResult),
              }),
            };
          },
          update: (patch: Record<string, unknown>) => ({
            eq: (_col: string, id: string) => {
              updatePayloads.push({ id, patch });
              return Promise.resolve(updateNotificationResult);
            },
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => makeAdminFake(),
}));

// 学生 / 企業のフィクスチャ。
// - 学生: line_enabled は migration 20260427010000 で drop 済みのためカラム無し
// - 企業: line_enabled は initial schema 由来の名前で、企業ではメール送信のマスター
const studentAllOnFixture = {
  id: "s",
  student_id: "student-1",
  scout_received: true,
  chat_message: true,
  event_reminder: true,
  system_announcement: true,
  in_app_enabled: true,
  updated_at: null,
};

const companyAllOnFixture = {
  id: "c",
  company_member_id: "cm-1",
  scout_accepted: true,
  scout_declined: true,
  chat_message: true,
  event_reminder: true,
  system_announcement: true,
  line_enabled: true,
  in_app_enabled: true,
  updated_at: null,
};

// ---------------------------------------------------------------
// テスト
// ---------------------------------------------------------------

describe("features/notification/lib/notify", () => {
  beforeEach(() => {
    vi.stubEnv(
      "LINE_MESSAGING_CHANNEL_ACCESS_TOKEN",
      "test-channel-access-token",
    );
    studentSettingsResult = { data: null, error: null };
    companySettingsResult = { data: null, error: null };
    lineFriendshipResult = { data: null, error: null };
    companyMemberResult = { data: null, error: null };
    insertNotificationResult = {
      data: { id: "notif-id-1" },
      error: null,
    };
    updateNotificationResult = { error: null };
    insertPayloads.length = 0;
    updatePayloads.length = 0;
    pushLineMessageMock.mockReset();
    pushLineMessageMock.mockResolvedValue(undefined);
    sendNotificationEmailMock.mockReset();
    sendNotificationEmailMock.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  // -------------------------------------------------------------
  // 学生 (LINE 経路)
  // -------------------------------------------------------------

  it("学生への scout_received: in-app INSERT + LINE push + line_sent_at 更新", async () => {
    studentSettingsResult = { data: studentAllOnFixture, error: null };
    lineFriendshipResult = {
      data: { line_uid: "U-line-1" },
      error: null,
    };

    const { notify } = await import("../notify");
    const result = await notify({
      userId: "student-1",
      recipientRole: "student",
      type: "scout_received",
      title: "スカウトが届きました",
      body: "審査済み株式会社から",
      referenceType: "scouts",
      referenceId: "scout-1",
    });

    expect(result.notificationId).toBe("notif-id-1");
    expect(result.lineSent).toBe(true);
    expect(result.emailSent).toBe(false);

    expect(insertPayloads).toHaveLength(1);
    expect(insertPayloads[0]).toMatchObject({
      user_id: "student-1",
      type: "scout_received",
      title: "スカウトが届きました",
      body: "審査済み株式会社から",
      reference_type: "scouts",
      reference_id: "scout-1",
    });

    expect(pushLineMessageMock).toHaveBeenCalledTimes(1);
    expect(pushLineMessageMock.mock.calls[0][0]).toBe("U-line-1");

    expect(updatePayloads).toHaveLength(1);
    expect(updatePayloads[0].id).toBe("notif-id-1");
    expect(updatePayloads[0].patch.line_sent_at).toEqual(expect.any(String));

    expect(sendNotificationEmailMock).not.toHaveBeenCalled();
  });

  it("学生の scout_received 通知 OFF → in-app は保存するが LINE は送らない", async () => {
    studentSettingsResult = {
      data: { ...studentAllOnFixture, scout_received: false },
      error: null,
    };

    const { notify } = await import("../notify");
    const result = await notify({
      userId: "student-1",
      recipientRole: "student",
      type: "scout_received",
      title: "スカウトが届きました",
    });

    expect(result.notificationId).toBe("notif-id-1");
    expect(result.lineSent).toBe(false);
    expect(insertPayloads).toHaveLength(1);
    expect(pushLineMessageMock).not.toHaveBeenCalled();
  });

  it("in_app_enabled OFF でも notifications への INSERT は実行される（履歴は常に残す）", async () => {
    studentSettingsResult = {
      data: {
        ...studentAllOnFixture,
        in_app_enabled: false,
        scout_received: false,
      },
      error: null,
    };

    const { notify } = await import("../notify");
    const result = await notify({
      userId: "student-1",
      recipientRole: "student",
      type: "scout_received",
      title: "hi",
    });

    expect(result.notificationId).toBe("notif-id-1");
    expect(insertPayloads).toHaveLength(1);
  });

  it("学生の LINE 未連携（line_friendships に行が無い）→ in-app のみ保存し lineSent=false", async () => {
    studentSettingsResult = { data: studentAllOnFixture, error: null };
    lineFriendshipResult = { data: null, error: null };

    const { notify } = await import("../notify");
    const result = await notify({
      userId: "student-1",
      recipientRole: "student",
      type: "scout_received",
      title: "hi",
    });

    expect(result.notificationId).toBe("notif-id-1");
    expect(result.lineSent).toBe(false);
    expect(pushLineMessageMock).not.toHaveBeenCalled();
    expect(updatePayloads).toHaveLength(0);
  });

  it("LINE push 失敗 → 例外を握りつぶし、in-app は残したまま lineSent=false", async () => {
    studentSettingsResult = { data: studentAllOnFixture, error: null };
    lineFriendshipResult = {
      data: { line_uid: "U-line-1" },
      error: null,
    };
    pushLineMessageMock.mockRejectedValue(new Error("LINE API down"));
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => {});

    const { notify } = await import("../notify");
    const result = await notify({
      userId: "student-1",
      recipientRole: "student",
      type: "scout_received",
      title: "hi",
    });

    expect(result.notificationId).toBe("notif-id-1");
    expect(result.lineSent).toBe(false);
    expect(updatePayloads).toHaveLength(0);
    expect(consoleErr).toHaveBeenCalled();
  });

  it("LINE 送信成功 + line_sent_at UPDATE 失敗 → lineSent=true のまま console.error でログ", async () => {
    studentSettingsResult = { data: studentAllOnFixture, error: null };
    lineFriendshipResult = {
      data: { line_uid: "U-line-1" },
      error: null,
    };
    updateNotificationResult = {
      error: { message: "simulated update failure" },
    };
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => {});

    const { notify } = await import("../notify");
    const result = await notify({
      userId: "student-1",
      recipientRole: "student",
      type: "scout_received",
      title: "hi",
    });

    expect(result.notificationId).toBe("notif-id-1");
    // LINE 送信自体は成功しているので lineSent は true
    expect(result.lineSent).toBe(true);
    expect(pushLineMessageMock).toHaveBeenCalledTimes(1);
    expect(consoleErr).toHaveBeenCalledWith(
      expect.stringContaining("line_sent_at の更新に失敗"),
      expect.objectContaining({ notificationId: "notif-id-1" }),
    );
  });

  // -------------------------------------------------------------
  // 企業担当者 (Email 経路)
  // -------------------------------------------------------------

  it("企業担当者のメール通知: company_members.email から解決して Resend で送信", async () => {
    companySettingsResult = { data: companyAllOnFixture, error: null };
    companyMemberResult = {
      data: { email: "cm@example.com" },
      error: null,
    };

    const { notify } = await import("../notify");
    const result = await notify({
      userId: "cm-1",
      recipientRole: "company_member",
      type: "scout_accepted",
      title: "スカウトが承諾されました",
      body: "○○さんが承諾しました",
    });

    expect(result.notificationId).toBe("notif-id-1");
    expect(result.lineSent).toBe(false);
    expect(result.emailSent).toBe(true);
    expect(pushLineMessageMock).not.toHaveBeenCalled();

    expect(sendNotificationEmailMock).toHaveBeenCalledTimes(1);
    expect(sendNotificationEmailMock.mock.calls[0][0]).toMatchObject({
      to: "cm@example.com",
      type: "scout_accepted",
      title: "スカウトが承諾されました",
      body: "○○さんが承諾しました",
    });

    expect(insertPayloads).toHaveLength(1);
    expect(insertPayloads[0]).toMatchObject({
      user_id: "cm-1",
      type: "scout_accepted",
    });
  });

  it("企業担当者でマスター（line_enabled）OFF → in-app のみ保存しメールは送らない", async () => {
    companySettingsResult = {
      data: { ...companyAllOnFixture, line_enabled: false },
      error: null,
    };

    const { notify } = await import("../notify");
    const result = await notify({
      userId: "cm-1",
      recipientRole: "company_member",
      type: "scout_accepted",
      title: "hi",
    });

    expect(result.emailSent).toBe(false);
    expect(sendNotificationEmailMock).not.toHaveBeenCalled();
    expect(insertPayloads).toHaveLength(1);
  });

  it("企業担当者で種別フラグ OFF（scout_accepted = false）→ メール送らず in-app は残す", async () => {
    companySettingsResult = {
      data: { ...companyAllOnFixture, scout_accepted: false },
      error: null,
    };

    const { notify } = await import("../notify");
    const result = await notify({
      userId: "cm-1",
      recipientRole: "company_member",
      type: "scout_accepted",
      title: "hi",
    });

    expect(result.emailSent).toBe(false);
    expect(sendNotificationEmailMock).not.toHaveBeenCalled();
    expect(insertPayloads).toHaveLength(1);
  });

  it("企業担当者でメールアドレス解決不可（company_members に行が無い）→ emailSent=false", async () => {
    companySettingsResult = { data: companyAllOnFixture, error: null };
    companyMemberResult = { data: null, error: null };

    const { notify } = await import("../notify");
    const result = await notify({
      userId: "cm-1",
      recipientRole: "company_member",
      type: "scout_accepted",
      title: "hi",
    });

    expect(result.emailSent).toBe(false);
    expect(sendNotificationEmailMock).not.toHaveBeenCalled();
  });

  it("企業担当者でメール送信失敗 → emailSent=false（in-app は残す、握りつぶし）", async () => {
    companySettingsResult = { data: companyAllOnFixture, error: null };
    companyMemberResult = {
      data: { email: "cm@example.com" },
      error: null,
    };
    sendNotificationEmailMock.mockResolvedValue(false);

    const { notify } = await import("../notify");
    const result = await notify({
      userId: "cm-1",
      recipientRole: "company_member",
      type: "scout_accepted",
      title: "hi",
    });

    expect(result.notificationId).toBe("notif-id-1");
    expect(result.emailSent).toBe(false);
    expect(insertPayloads).toHaveLength(1);
  });

  it("企業担当者は LINE チャネルを使わない（line_friendships にデータがあっても push されない）", async () => {
    companySettingsResult = { data: companyAllOnFixture, error: null };
    // 企業向けには line_friendships を引かないが、念のため値があっても push されないことを確認
    lineFriendshipResult = { data: { line_uid: "U-line-cm" }, error: null };

    const { notify } = await import("../notify");
    await notify({
      userId: "cm-1",
      recipientRole: "company_member",
      type: "scout_accepted",
      title: "hi",
    });

    expect(pushLineMessageMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------
  // INSERT 失敗
  // -------------------------------------------------------------

  it("notifications INSERT 失敗時は例外を投げる", async () => {
    studentSettingsResult = { data: studentAllOnFixture, error: null };
    insertNotificationResult = {
      data: null,
      error: { message: "simulated insert failure" },
    };

    const { notify } = await import("../notify");
    await expect(
      notify({
        userId: "student-1",
        recipientRole: "student",
        type: "scout_received",
        title: "hi",
      }),
    ).rejects.toThrow(/notifications INSERT に失敗/);
  });
});
