import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPasswordMock = vi.fn();
const signOutMock = vi.fn();
const createClientMock = vi.fn(() => ({
  auth: {
    signInWithPassword: signInWithPasswordMock,
    signOut: signOutMock,
  },
}));
const redirectMock = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

beforeEach(() => {
  signInWithPasswordMock.mockReset();
  signOutMock.mockReset();
  redirectMock.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

function buildFormData(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    fd.set(key, value);
  }
  return fd;
}

describe("loginAction", () => {
  it("メールアドレスが不正な形式の場合は validation エラーを返す", async () => {
    const { loginAction } = await import("@/features/auth/actions/login");
    const formData = buildFormData({
      email: "not-an-email",
      password: "password123",
    });

    const result = await loginAction({}, formData);

    expect(result.error).toBe("有効なメールアドレスを入力してください");
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("パスワードが空の場合は validation エラーを返す", async () => {
    const { loginAction } = await import("@/features/auth/actions/login");
    const formData = buildFormData({
      email: "owner@example.com",
      password: "",
    });

    const result = await loginAction({}, formData);

    expect(result.error).toBe("パスワードを入力してください");
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it("Supabase Auth が認証エラーを返した場合は汎用エラーメッセージを返す", async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });
    const { loginAction } = await import("@/features/auth/actions/login");
    const formData = buildFormData({
      email: "owner@example.com",
      password: "wrong-password",
    });

    const result = await loginAction({}, formData);

    expect(result.error).toBe(
      "メールアドレスまたはパスワードが正しくありません",
    );
    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "wrong-password",
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("認証は成功するが企業ロールでない場合は signOut してエラーを返す", async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: {
        user: {
          id: "11111111-1111-1111-1111-111111111111",
          app_metadata: { role: "student" },
        },
      },
      error: null,
    });
    signOutMock.mockResolvedValue({ error: null });
    const { loginAction } = await import("@/features/auth/actions/login");
    const formData = buildFormData({
      email: "student@example.com",
      password: "password123",
    });

    const result = await loginAction({}, formData);

    expect(result.error).toBe("このポータルは企業アカウント専用です");
    expect(signOutMock).toHaveBeenCalledOnce();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("ロールが未設定の場合も企業アカウント専用エラーを返す", async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: {
        user: {
          id: "22222222-2222-2222-2222-222222222222",
          app_metadata: {},
        },
      },
      error: null,
    });
    signOutMock.mockResolvedValue({ error: null });
    const { loginAction } = await import("@/features/auth/actions/login");
    const formData = buildFormData({
      email: "no-role@example.com",
      password: "password123",
    });

    const result = await loginAction({}, formData);

    expect(result.error).toBe("このポータルは企業アカウント専用です");
    expect(signOutMock).toHaveBeenCalledOnce();
  });

  it.each([
    ["company_owner"],
    ["company_admin"],
    ["company_member"],
  ])(
    "ロール %s で認証成功した場合は /company/dashboard にリダイレクト",
    async (role) => {
      signInWithPasswordMock.mockResolvedValue({
        data: {
          user: {
            id: "33333333-3333-3333-3333-333333333333",
            app_metadata: { role },
          },
        },
        error: null,
      });
      const { loginAction } = await import("@/features/auth/actions/login");
      const formData = buildFormData({
        email: "owner@verified-corp.com",
        password: "password123",
      });

      await expect(loginAction({}, formData)).rejects.toThrow(
        /NEXT_REDIRECT/,
      );

      expect(redirectMock).toHaveBeenCalledWith("/company/dashboard");
      expect(signOutMock).not.toHaveBeenCalled();
    },
  );
});
