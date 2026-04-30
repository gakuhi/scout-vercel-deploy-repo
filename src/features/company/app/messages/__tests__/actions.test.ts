import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getUserMock = vi.fn();
const getCompanyMembershipMock = vi.fn();
const selectScoutMock = vi.fn();
const insertMock = vi.fn();
const revalidatePathMock = vi.fn();
const deleteMock = vi.fn();
const updateMock = vi.fn();
const storageRemoveMock = vi.fn();
const storageUploadMock = vi.fn();
const createSignedUrlsMock = vi.fn();
const selectMessagesMock = vi.fn();
const selectScoutInfoMock = vi.fn();
const selectScoutIdsMock = vi.fn();

// insertMock に _result を持たせる拡張
// @ts-expect-error -- テスト用カスタムプロパティ
insertMock._result = undefined as
  | { data: Record<string, unknown> | null; error: Record<string, unknown> | null }
  | undefined;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: getUserMock },
      from: vi.fn((table: string) => {
        if (table === "chat_messages") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: selectScoutMock,
                  order: vi.fn(() => selectMessagesMock()),
                })),
                order: vi.fn(() => selectMessagesMock()),
              })),
            })),
            insert: insertMock.mockReturnValue({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  // @ts-expect-error -- テスト用カスタムプロパティ
                  Promise.resolve(insertMock._result ?? { data: null, error: null }),
                ),
              })),
            }),
            delete: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve(deleteMock())),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  is: vi.fn(() => Promise.resolve(updateMock())),
                })),
              })),
            })),
          };
        }
        if (table === "scouts") {
          return {
            select: vi.fn((columns?: string) => {
              if (columns === "id") {
                return {
                  in: vi.fn(() => ({
                    eq: vi.fn(() => selectScoutIdsMock()),
                  })),
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      maybeSingle: selectScoutMock,
                    })),
                  })),
                };
              }
              if (columns?.includes("job_postings")) {
                return {
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      eq: vi.fn(() => ({
                        maybeSingle: selectScoutInfoMock,
                      })),
                    })),
                  })),
                };
              }
              return {
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: selectScoutMock,
                  })),
                })),
              };
            }),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: selectScoutMock,
              })),
            })),
          })),
        };
      }),
      storage: {
        from: vi.fn(() => ({
          remove: storageRemoveMock.mockResolvedValue({ error: null }),
          upload: storageUploadMock,
          createSignedUrls: createSignedUrlsMock,
        })),
      },
    }),
  ),
}));

vi.mock("@/features/company/app/messages/queries", () => ({
  getCompanyMembership: (...args: unknown[]) =>
    getCompanyMembershipMock(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

function setupOwner() {
  getUserMock.mockResolvedValue({
    data: { user: { id: "user-1" } },
  });
  getCompanyMembershipMock.mockResolvedValue({
    companyId: "company-1",
    role: "owner",
  });
}

function setupNoAuth() {
  getUserMock.mockResolvedValue({ data: { user: null } });
}

function setupNoMembership() {
  getUserMock.mockResolvedValue({
    data: { user: { id: "user-1" } },
  });
  getCompanyMembershipMock.mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();
  selectScoutMock.mockResolvedValue({ data: null });
  // @ts-expect-error -- テスト用カスタムプロパティ
  insertMock._result = undefined;
  deleteMock.mockResolvedValue({ error: null });
  updateMock.mockResolvedValue({ error: null });
  selectMessagesMock.mockResolvedValue({ data: [] });
  selectScoutInfoMock.mockResolvedValue({ data: null });
  selectScoutIdsMock.mockResolvedValue({ data: [] });
  storageUploadMock.mockResolvedValue({ error: null });
  createSignedUrlsMock.mockResolvedValue({ data: [], error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =============================================
// sendMessage
// =============================================

describe("sendMessage", () => {
  it("メッセージが空の場合はエラーを返す", async () => {
    const { sendMessage } = await import(
      "@/features/company/app/messages/actions"
    );
    const result = await sendMessage("scout-1", "   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("メッセージを入力してください");
  });

  it("未ログインの場合はエラーを返す", async () => {
    setupNoAuth();

    const { sendMessage } = await import(
      "@/features/company/app/messages/actions"
    );
    const result = await sendMessage("scout-1", "テスト");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("ログインが必要です");
  });

  it("企業情報が見つからない場合はエラーを返す", async () => {
    setupNoMembership();

    const { sendMessage } = await import(
      "@/features/company/app/messages/actions"
    );
    const result = await sendMessage("scout-1", "テスト");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("企業情報が見つかりません");
  });

  it("スカウトが見つからない場合はエラーを返す", async () => {
    setupOwner();
    selectScoutMock.mockResolvedValue({ data: null });

    const { sendMessage } = await import(
      "@/features/company/app/messages/actions"
    );
    const result = await sendMessage("scout-1", "テスト");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("対象のスカウトが見つかりません");
  });

  it("承諾済みでないスカウトの場合はエラーを返す", async () => {
    setupOwner();
    selectScoutMock.mockResolvedValue({ data: { status: "sent" } });

    const { sendMessage } = await import(
      "@/features/company/app/messages/actions"
    );
    const result = await sendMessage("scout-1", "テスト");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(
        "承諾済みのスカウトでのみメッセージを送信できます",
      );
    }
  });

  it("正常に送信できた場合は ok を返す", async () => {
    setupOwner();
    selectScoutMock.mockResolvedValue({ data: { status: "accepted" } });
    // @ts-expect-error -- テスト用カスタムプロパティ
    insertMock._result = {
      data: {
        id: "msg-1",
        scout_id: "scout-1",
        sender_id: "user-1",
        sender_role: "company_member",
        content: "テスト",
        created_at: "2026-04-27T10:00:00Z",
        read_at: null,
        attachments: [],
      },
      error: null,
    };

    const { sendMessage } = await import(
      "@/features/company/app/messages/actions"
    );
    const result = await sendMessage("scout-1", "テスト");
    expect(result.ok).toBe(true);
  });

  it("INSERT失敗の場合はエラーを返す（DBエラー隠蔽）", async () => {
    setupOwner();
    selectScoutMock.mockResolvedValue({ data: { status: "accepted" } });
    // @ts-expect-error -- テスト用カスタムプロパティ
    insertMock._result = {
      data: null,
      error: { message: "RLS violation" },
    };

    const { sendMessage } = await import(
      "@/features/company/app/messages/actions"
    );
    const result = await sendMessage("scout-1", "テスト");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("送信に失敗しました");
      expect(result.error).not.toContain("RLS");
    }
  });
});

// =============================================
// sendMessageAction
// =============================================

describe("sendMessageAction", () => {
  it("scoutId がない場合はエラーを返す", async () => {
    const { sendMessageAction } = await import(
      "@/features/company/app/messages/actions"
    );
    const fd = new FormData();
    fd.set("content", "テスト");
    const result = await sendMessageAction({}, fd);
    expect(result.error).toBe("入力内容を確認してください");
  });
});

// =============================================
// deleteMessage
// =============================================

describe("deleteMessage", () => {
  it("未ログインの場合は何もしない", async () => {
    setupNoAuth();

    const { deleteMessage } = await import(
      "@/features/company/app/messages/actions"
    );
    await deleteMessage("msg-1");
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("メッセージを削除する", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    selectScoutMock.mockResolvedValue({ data: { attachments: [] } });

    const { deleteMessage } = await import(
      "@/features/company/app/messages/actions"
    );
    await deleteMessage("msg-1");
    expect(deleteMock).toHaveBeenCalled();
  });

  it("添付ファイルがある場合はStorageからも削除する", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    selectScoutMock.mockResolvedValue({
      data: {
        attachments: [{ path: "scout-1/file.png", id: "a1", kind: "image", name: "file.png", mimeType: null, sizeBytes: null }],
      },
    });

    const { deleteMessage } = await import(
      "@/features/company/app/messages/actions"
    );
    await deleteMessage("msg-1");
    expect(storageRemoveMock).toHaveBeenCalledWith(["scout-1/file.png"]);
  });
});

// =============================================
// getMessages
// =============================================

describe("getMessages", () => {
  it("未ログインの場合は空配列を返す", async () => {
    setupNoAuth();

    const { getMessages } = await import(
      "@/features/company/app/messages/actions"
    );
    const result = await getMessages("scout-1");
    expect(result).toEqual([]);
  });

  it("企業情報がない場合は空配列を返す", async () => {
    setupNoMembership();

    const { getMessages } = await import(
      "@/features/company/app/messages/actions"
    );
    const result = await getMessages("scout-1");
    expect(result).toEqual([]);
  });

  it("他社のスカウトの場合は空配列を返す", async () => {
    setupOwner();
    selectScoutMock.mockResolvedValue({ data: null });

    const { getMessages } = await import(
      "@/features/company/app/messages/actions"
    );
    const result = await getMessages("other-scout");
    expect(result).toEqual([]);
  });

  it("自社スカウトのメッセージを返す", async () => {
    setupOwner();
    selectScoutMock.mockResolvedValue({ data: { id: "scout-1" } });
    selectMessagesMock.mockResolvedValue({
      data: [
        {
          id: "m1",
          scout_id: "scout-1",
          sender_id: "user-1",
          sender_role: "company_member",
          content: "hello",
          read_at: null,
          created_at: "2026-04-27T10:00:00Z",
          attachments: [],
        },
      ],
    });

    const { getMessages } = await import(
      "@/features/company/app/messages/actions"
    );
    const result = await getMessages("scout-1");
    expect(result).toHaveLength(1);
    expect(result[0].senderDisplay).toBe("me");
  });
});

// =============================================
// getAttachmentSignedUrls
// =============================================

describe("getAttachmentSignedUrls", () => {
  it("空配列の場合は空オブジェクトを返す", async () => {
    const { getAttachmentSignedUrls } = await import(
      "@/features/company/app/messages/actions"
    );
    const result = await getAttachmentSignedUrls([]);
    expect(result).toEqual({});
  });

  it("未ログインの場合は空オブジェクトを返す", async () => {
    setupNoAuth();

    const { getAttachmentSignedUrls } = await import(
      "@/features/company/app/messages/actions"
    );
    const result = await getAttachmentSignedUrls(["scout-1/file.png"]);
    expect(result).toEqual({});
  });

  it("企業情報がない場合は空オブジェクトを返す", async () => {
    setupNoMembership();

    const { getAttachmentSignedUrls } = await import(
      "@/features/company/app/messages/actions"
    );
    const result = await getAttachmentSignedUrls(["scout-1/file.png"]);
    expect(result).toEqual({});
  });

  it("他社スカウトのパスは除外される", async () => {
    setupOwner();
    selectScoutIdsMock.mockResolvedValue({ data: [] });

    const { getAttachmentSignedUrls } = await import(
      "@/features/company/app/messages/actions"
    );
    const result = await getAttachmentSignedUrls(["other-scout/file.png"]);
    expect(result).toEqual({});
    expect(createSignedUrlsMock).not.toHaveBeenCalled();
  });

  it("自社スカウトのパスに署名URLを返す", async () => {
    setupOwner();
    selectScoutIdsMock.mockResolvedValue({ data: [{ id: "scout-1" }] });
    createSignedUrlsMock.mockResolvedValue({
      data: [{ path: "scout-1/file.png", signedUrl: "https://signed.url/file.png" }],
      error: null,
    });

    const { getAttachmentSignedUrls } = await import(
      "@/features/company/app/messages/actions"
    );
    const result = await getAttachmentSignedUrls(["scout-1/file.png"]);
    expect(result).toEqual({ "scout-1/file.png": "https://signed.url/file.png" });
  });
});

// =============================================
// markMessagesAsReadAction
// =============================================

describe("markMessagesAsReadAction", () => {
  it("未ログインの場合は何もしない", async () => {
    setupNoAuth();

    const { markMessagesAsReadAction } = await import(
      "@/features/company/app/messages/actions"
    );
    await markMessagesAsReadAction("scout-1");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("ログイン済みの場合は既読化する", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { markMessagesAsReadAction } = await import(
      "@/features/company/app/messages/actions"
    );
    await markMessagesAsReadAction("scout-1");
    expect(updateMock).toHaveBeenCalled();
  });
});

// =============================================
// uploadAttachment
// =============================================

describe("uploadAttachment", () => {
  it("ファイルがない場合はエラーを返す", async () => {
    const { uploadAttachment } = await import(
      "@/features/company/app/messages/actions"
    );
    const fd = new FormData();
    const result = await uploadAttachment("scout-1", fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("ファイルが選択されていません");
  });

  it("20MBを超える場合はエラーを返す", async () => {
    const { uploadAttachment } = await import(
      "@/features/company/app/messages/actions"
    );
    const fd = new FormData();
    const bigFile = new File(["x".repeat(100)], "big.png", { type: "image/png" });
    Object.defineProperty(bigFile, "size", { value: 21 * 1024 * 1024 });
    fd.set("file", bigFile);
    const result = await uploadAttachment("scout-1", fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("ファイルサイズは20MB以下にしてください");
  });

  it("未ログインの場合はエラーを返す", async () => {
    setupNoAuth();

    const { uploadAttachment } = await import(
      "@/features/company/app/messages/actions"
    );
    const fd = new FormData();
    fd.set("file", new File(["data"], "test.png", { type: "image/png" }));
    const result = await uploadAttachment("scout-1", fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("ログインが必要です");
  });

  it("企業情報がない場合はエラーを返す", async () => {
    setupNoMembership();

    const { uploadAttachment } = await import(
      "@/features/company/app/messages/actions"
    );
    const fd = new FormData();
    fd.set("file", new File(["data"], "test.png", { type: "image/png" }));
    const result = await uploadAttachment("scout-1", fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("企業情報が見つかりません");
  });

  it("アップロード失敗の場合はエラーを返す", async () => {
    setupOwner();
    storageUploadMock.mockResolvedValue({ error: { message: "storage error" } });

    const { uploadAttachment } = await import(
      "@/features/company/app/messages/actions"
    );
    const fd = new FormData();
    fd.set("file", new File(["data"], "test.png", { type: "image/png" }));
    const result = await uploadAttachment("scout-1", fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("ファイルのアップロードに失敗しました");
  });

  it("正常にアップロードできた場合はattachmentを返す", async () => {
    setupOwner();
    storageUploadMock.mockResolvedValue({ error: null });

    const { uploadAttachment } = await import(
      "@/features/company/app/messages/actions"
    );
    const fd = new FormData();
    fd.set("file", new File(["data"], "photo.jpg", { type: "image/jpeg" }));
    const result = await uploadAttachment("scout-1", fd);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.attachment.kind).toBe("image");
      expect(result.attachment.name).toBe("photo.jpg");
      expect(result.attachment.path).toMatch(/^scout-1\//);
    }
  });

  it("動画ファイルのkindがvideoになる", async () => {
    setupOwner();
    storageUploadMock.mockResolvedValue({ error: null });

    const { uploadAttachment } = await import(
      "@/features/company/app/messages/actions"
    );
    const fd = new FormData();
    fd.set("file", new File(["data"], "clip.mp4", { type: "video/mp4" }));
    const result = await uploadAttachment("scout-1", fd);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.attachment.kind).toBe("video");
  });

  it("その他ファイルのkindがfileになる", async () => {
    setupOwner();
    storageUploadMock.mockResolvedValue({ error: null });

    const { uploadAttachment } = await import(
      "@/features/company/app/messages/actions"
    );
    const fd = new FormData();
    fd.set("file", new File(["data"], "doc.pdf", { type: "application/pdf" }));
    const result = await uploadAttachment("scout-1", fd);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.attachment.kind).toBe("file");
  });
});

// =============================================
// getScoutInfo
// =============================================

describe("getScoutInfo", () => {
  it("未ログインの場合はnullを返す", async () => {
    setupNoAuth();

    const { getScoutInfo } = await import(
      "@/features/company/app/messages/actions"
    );
    const result = await getScoutInfo("scout-1");
    expect(result).toBeNull();
  });

  it("企業情報がない場合はnullを返す", async () => {
    setupNoMembership();

    const { getScoutInfo } = await import(
      "@/features/company/app/messages/actions"
    );
    const result = await getScoutInfo("scout-1");
    expect(result).toBeNull();
  });

  it("スカウトが見つからない場合はnullを返す", async () => {
    setupOwner();
    selectScoutInfoMock.mockResolvedValue({ data: null });

    const { getScoutInfo } = await import(
      "@/features/company/app/messages/actions"
    );
    const result = await getScoutInfo("scout-1");
    expect(result).toBeNull();
  });

  it("スカウト情報を返す", async () => {
    setupOwner();
    selectScoutInfoMock.mockResolvedValue({
      data: {
        subject: "エンジニア職のご案内",
        message: "ぜひお話させてください",
        job_postings: { title: "フロントエンドエンジニア" },
      },
    });

    const { getScoutInfo } = await import(
      "@/features/company/app/messages/actions"
    );
    const result = await getScoutInfo("scout-1");
    expect(result).toEqual({
      scoutSubject: "エンジニア職のご案内",
      scoutMessage: "ぜひお話させてください",
      jobPostingTitle: "フロントエンドエンジニア",
    });
  });
});
