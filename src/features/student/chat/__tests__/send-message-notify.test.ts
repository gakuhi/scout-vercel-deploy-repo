import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- mocks ---

const notifyMock = vi.fn();
vi.mock("@/features/notification", () => ({
  notify: notifyMock,
}));

const getUserMock = vi.fn();
const selectMock = vi.fn();
const eqScoutIdMock = vi.fn();
const eqStudentIdMock = vi.fn();
const maybeSingleMock = vi.fn();
const insertSingleMock = vi.fn();
const insertSelectMock = vi.fn();
const insertMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
    storage: { from: vi.fn(() => ({ remove: vi.fn() })) },
  })),
}));

beforeEach(() => {
  notifyMock.mockResolvedValue({ lineSent: false, emailSent: false });
  getUserMock.mockResolvedValue({ data: { user: { id: "student-1" } } });
});

afterEach(() => {
  vi.clearAllMocks();
});

/**
 * scouts SELECT → chat_messages INSERT のチェーンを組み立てるヘルパー。
 */
function setupChain(
  scoutResult: { data: unknown },
  insertResult: { data: unknown; error: unknown },
) {
  // scouts.select().eq().eq().maybeSingle()
  maybeSingleMock.mockResolvedValueOnce(scoutResult);
  eqStudentIdMock.mockReturnValueOnce({ maybeSingle: maybeSingleMock });
  eqScoutIdMock.mockReturnValueOnce({ eq: eqStudentIdMock });
  selectMock.mockReturnValueOnce({ eq: eqScoutIdMock });

  // chat_messages.insert().select().single()
  insertSingleMock.mockResolvedValueOnce(insertResult);
  insertSelectMock.mockReturnValueOnce({ single: insertSingleMock });
  insertMock.mockReturnValueOnce({ select: insertSelectMock });

  let callCount = 0;
  fromMock.mockImplementation(() => {
    callCount++;
    if (callCount === 1) return { select: selectMock };
    return { insert: insertMock };
  });
}

describe("sendMessage → notify 配線", () => {
  it("メッセージ送信成功時に企業担当者へ chat_new_message 通知を送る", async () => {
    setupChain(
      { data: { status: "accepted", sender_id: "company-member-1" } },
      {
        data: {
          id: "msg-1",
          scout_id: "scout-1",
          sender_id: "student-1",
          sender_role: "student",
          content: "よろしくお願いします",
          read_at: null,
          created_at: "2026-04-30T00:00:00Z",
          attachments: null,
        },
        error: null,
      },
    );

    const { sendMessage } = await import("../actions");
    const result = await sendMessage("scout-1", "よろしくお願いします");

    expect(result.ok).toBe(true);
    expect(notifyMock).toHaveBeenCalledWith({
      userId: "company-member-1",
      recipientRole: "company_member",
      type: "chat_new_message",
      title: "学生からメッセージが届きました",
      body: "よろしくお願いします",
      referenceType: "scouts",
      referenceId: "scout-1",
    });
  });

  it("メッセージ送信失敗時は notify を呼ばない", async () => {
    setupChain(
      { data: { status: "accepted", sender_id: "company-member-1" } },
      { data: null, error: { message: "insert failed" } },
    );

    const { sendMessage } = await import("../actions");
    const result = await sendMessage("scout-1", "テスト");

    expect(result.ok).toBe(false);
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("notify が失敗してもメッセージ送信は成功扱いになる", async () => {
    notifyMock.mockRejectedValueOnce(new Error("notify failed"));

    setupChain(
      { data: { status: "accepted", sender_id: "company-member-1" } },
      {
        data: {
          id: "msg-2",
          scout_id: "scout-1",
          sender_id: "student-1",
          sender_role: "student",
          content: "テスト",
          read_at: null,
          created_at: "2026-04-30T00:00:00Z",
          attachments: null,
        },
        error: null,
      },
    );

    const { sendMessage } = await import("../actions");
    const result = await sendMessage("scout-1", "テスト");

    expect(result.ok).toBe(true);
    expect(notifyMock).toHaveBeenCalled();
  });
});
