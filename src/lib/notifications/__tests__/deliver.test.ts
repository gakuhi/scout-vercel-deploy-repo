import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Settings = {
  scout_received: boolean;
  chat_message: boolean;
  event_reminder: boolean;
  system_announcement: boolean;
};

type Student = { line_uid: string | null } | null;

const ALL_ON: Settings = {
  scout_received: true,
  chat_message: true,
  event_reminder: true,
  system_announcement: true,
};

const sendLineScoutMessageMock = vi.fn();
const createAdminClientMock = vi.fn();

vi.mock("@/lib/notifications/line", () => ({
  sendLineScoutMessage: (...args: unknown[]) => sendLineScoutMessageMock(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => createAdminClientMock(),
}));

/**
 * deliverNotification が叩く 3 テーブル分のチェーンだけをサポートする軽量モック。
 * - `student_notification_settings` / `students` は select().eq().maybeSingle() で読む
 * - `notifications` は insert() で書く
 */
function buildSupabaseMock(opts: {
  settings?: Settings | null;
  student?: Student;
}) {
  const insertFn = vi.fn(async () => ({ data: null, error: null }));
  const client = {
    from(table: string) {
      if (table === "notifications") {
        return { insert: insertFn };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              if (table === "student_notification_settings") {
                return { data: opts.settings ?? null };
              }
              if (table === "students") {
                return { data: opts.student ?? null };
              }
              return { data: null };
            },
          }),
        }),
      };
    },
  };
  return { client, insertFn };
}

beforeEach(() => {
  sendLineScoutMessageMock.mockReset();
  createAdminClientMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("deliverNotification", () => {
  it("settings が行未作成（null）でも LINE と in-app の両方を配信する（全 ON デフォルト）", async () => {
    const { insertFn, client } = buildSupabaseMock({
      settings: null,
      student: { line_uid: "U-123" },
    });
    createAdminClientMock.mockReturnValue(client);

    const { deliverNotification } = await import("../deliver");
    await deliverNotification({
      userId: "user-1",
      type: "scout_received",
      title: "t",
      body: "b",
    });

    expect(sendLineScoutMessageMock).toHaveBeenCalledTimes(1);
    expect(sendLineScoutMessageMock).toHaveBeenCalledWith("U-123", "t\n\nb");
    expect(insertFn).toHaveBeenCalledTimes(1);
    const insertPayload = insertFn.mock.calls[0][0];
    expect(insertPayload.line_sent_at).toEqual(expect.any(String));
  });

  it("タイプトグル OFF でも in-app には常に INSERT される（LINE は止まる）", async () => {
    const { insertFn, client } = buildSupabaseMock({
      settings: { ...ALL_ON, scout_received: false },
      student: { line_uid: "U-123" },
    });
    createAdminClientMock.mockReturnValue(client);

    const { deliverNotification } = await import("../deliver");
    await deliverNotification({
      userId: "user-1",
      type: "scout_received",
      title: "t",
    });

    expect(sendLineScoutMessageMock).not.toHaveBeenCalled();
    expect(insertFn).toHaveBeenCalledTimes(1);
    expect(insertFn.mock.calls[0][0].line_sent_at).toBeNull();
  });

  it("student に line_uid が紐づいていないときは LINE 送信せず in-app だけ INSERT される", async () => {
    const { insertFn, client } = buildSupabaseMock({
      settings: ALL_ON,
      student: { line_uid: null },
    });
    createAdminClientMock.mockReturnValue(client);

    const { deliverNotification } = await import("../deliver");
    await deliverNotification({
      userId: "user-1",
      type: "event_reminder",
      title: "t",
    });

    expect(sendLineScoutMessageMock).not.toHaveBeenCalled();
    expect(insertFn).toHaveBeenCalledTimes(1);
    expect(insertFn.mock.calls[0][0].line_sent_at).toBeNull();
  });

  it("LINE 送信で例外が起きても in-app INSERT は実行される（line_sent_at=null）", async () => {
    const { insertFn, client } = buildSupabaseMock({
      settings: ALL_ON,
      student: { line_uid: "U-123" },
    });
    createAdminClientMock.mockReturnValue(client);
    sendLineScoutMessageMock.mockRejectedValue(new Error("LINE API down"));

    const { deliverNotification } = await import("../deliver");
    await deliverNotification({
      userId: "user-1",
      type: "system_announcement",
      title: "t",
    });

    expect(sendLineScoutMessageMock).toHaveBeenCalledTimes(1);
    expect(insertFn).toHaveBeenCalledTimes(1);
    expect(insertFn.mock.calls[0][0].line_sent_at).toBeNull();
  });

  it("scout_accepted / scout_declined は scout_received トグルに連動する（LINE ゲート）", async () => {
    const { client } = buildSupabaseMock({
      settings: { ...ALL_ON, scout_received: false },
      student: { line_uid: "U-123" },
    });
    createAdminClientMock.mockReturnValue(client);

    const { deliverNotification } = await import("../deliver");
    await deliverNotification({
      userId: "user-1",
      type: "scout_accepted",
      title: "t",
    });
    await deliverNotification({
      userId: "user-1",
      type: "scout_declined",
      title: "t",
    });

    expect(sendLineScoutMessageMock).not.toHaveBeenCalled();
  });

  it("title のみ（body なし）の場合、LINE メッセージは title 単体で送られる", async () => {
    const { client } = buildSupabaseMock({
      settings: ALL_ON,
      student: { line_uid: "U-123" },
    });
    createAdminClientMock.mockReturnValue(client);

    const { deliverNotification } = await import("../deliver");
    await deliverNotification({
      userId: "user-1",
      type: "event_reminder",
      title: "リマインダー",
    });

    expect(sendLineScoutMessageMock).toHaveBeenCalledWith("U-123", "リマインダー");
  });

  it("INSERT ペイロードに type / title / body / reference_type / reference_id が乗る", async () => {
    const { insertFn, client } = buildSupabaseMock({
      settings: ALL_ON,
      student: { line_uid: null },
    });
    createAdminClientMock.mockReturnValue(client);

    const { deliverNotification } = await import("../deliver");
    await deliverNotification({
      userId: "user-1",
      type: "chat_new_message",
      title: "新着メッセージ",
      body: "こんにちは",
      referenceType: "chat_room",
      referenceId: "room-42",
    });

    expect(insertFn).toHaveBeenCalledTimes(1);
    const payload = insertFn.mock.calls[0][0];
    expect(payload).toMatchObject({
      user_id: "user-1",
      type: "chat_new_message",
      title: "新着メッセージ",
      body: "こんにちは",
      reference_type: "chat_room",
      reference_id: "room-42",
    });
  });
});
