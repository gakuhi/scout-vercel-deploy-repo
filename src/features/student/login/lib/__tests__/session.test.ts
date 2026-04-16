import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LineIdTokenPayload } from "../../types";

// Supabase admin client モック
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn();
const mockUpdateUserById = vi.fn();
const mockCreateUser = vi.fn();
const mockGenerateLink = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockFrom,
    auth: {
      admin: {
        updateUserById: mockUpdateUserById,
        createUser: mockCreateUser,
        generateLink: mockGenerateLink,
      },
    },
  }),
}));

function setupFromChain(data: unknown) {
  const chain = {
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    maybeSingle: mockMaybeSingle.mockResolvedValue({ data, error: null }),
    update: mockUpdate.mockReturnThis(),
    insert: mockInsert.mockResolvedValue({ error: null }),
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

const basePayload: LineIdTokenPayload = {
  iss: "https://access.line.me",
  sub: "U1234567890",
  aud: "test-channel-id",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
  nonce: "test-nonce",
  name: "テストユーザー",
  picture: "https://example.com/pic.jpg",
};

describe("session.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("lineEmail", () => {
    it("LINE user ID からプレースホルダー email を生成する", async () => {
      const { lineEmail } = await import("../session");
      expect(lineEmail("U1234567890")).toBe(
        "line_U1234567890@line.scout.local",
      );
    });
  });

  describe("createOrSignInLineUser", () => {
    it("既存ユーザーの場合メタデータを更新して magic link トークンを返す", async () => {
      setupFromChain({ id: "existing-user-id" });
      mockUpdateUserById.mockResolvedValue({ data: {}, error: null });
      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: "hashed-token-123" } },
        error: null,
      });

      const { createOrSignInLineUser } = await import("../session");
      const result = await createOrSignInLineUser(basePayload);

      expect(result.hashedToken).toBe("hashed-token-123");
      expect(result.isNewUser).toBe(false);
      expect(mockUpdateUserById).toHaveBeenCalledWith(
        "existing-user-id",
        expect.objectContaining({
          user_metadata: expect.objectContaining({
            line_user_id: "U1234567890",
          }),
        }),
      );
    });

    it("新規ユーザーの場合 Supabase Auth にユーザーを作成して students テーブルに INSERT する", async () => {
      // 1回目の from("students").select ... → null (ユーザー存在しない)
      // 2回目の from("students").insert ... → 成功
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: mockSelect.mockReturnValue({
              eq: mockEq.mockReturnValue({
                maybeSingle: mockMaybeSingle.mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          insert: mockInsert.mockResolvedValue({ error: null }),
        };
      });

      mockCreateUser.mockResolvedValue({
        data: { user: { id: "new-user-id" } },
        error: null,
      });
      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: "new-hashed-token" } },
        error: null,
      });

      const { createOrSignInLineUser } = await import("../session");
      const result = await createOrSignInLineUser(basePayload);

      expect(result.hashedToken).toBe("new-hashed-token");
      expect(result.isNewUser).toBe(true);
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: expect.stringContaining("line_U1234567890"),
          email_confirm: true,
        }),
      );
    });

    it("ユーザー作成に失敗した場合エラーを投げる", async () => {
      setupFromChain(null);
      mockCreateUser.mockResolvedValue({
        data: { user: null },
        error: { message: "create failed" },
      });

      const { createOrSignInLineUser } = await import("../session");
      await expect(createOrSignInLineUser(basePayload)).rejects.toThrow(
        "ユーザー作成に失敗しました",
      );
    });

    it("magic link 生成に失敗した場合エラーを投げる", async () => {
      setupFromChain({ id: "existing-id" });
      mockUpdateUserById.mockResolvedValue({ data: {}, error: null });
      mockGenerateLink.mockResolvedValue({
        data: null,
        error: { message: "link failed" },
      });

      const { createOrSignInLineUser } = await import("../session");
      await expect(createOrSignInLineUser(basePayload)).rejects.toThrow(
        "セッショントークンの生成に失敗しました",
      );
    });
  });
});
