import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const updateUserMock = vi.fn();
const createClientMock = vi.fn(() => ({
  auth: {
    updateUser: updateUserMock,
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
  updateUserMock.mockReset();
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

describe("resetPasswordAction", () => {
  it("パスワードが8文字未満の場合は validation エラーを返す", async () => {
    const { resetPasswordAction } = await import(
      "@/features/company/auth/actions/reset-password"
    );
    const formData = buildFormData({
      password: "short",
      confirmPassword: "short",
    });

    const result = await resetPasswordAction({}, formData);

    expect(result.error).toBe("パスワードは8文字以上で入力してください");
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("パスワードが72文字を超える場合は validation エラーを返す", async () => {
    const { resetPasswordAction } = await import(
      "@/features/company/auth/actions/reset-password"
    );
    const longPassword = "a".repeat(73);
    const formData = buildFormData({
      password: longPassword,
      confirmPassword: longPassword,
    });

    const result = await resetPasswordAction({}, formData);

    expect(result.error).toBe("パスワードは72文字以内で入力してください");
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("パスワードと確認パスワードが一致しない場合は validation エラーを返す", async () => {
    const { resetPasswordAction } = await import(
      "@/features/company/auth/actions/reset-password"
    );
    const formData = buildFormData({
      password: "newpassword123",
      confirmPassword: "different123",
    });

    const result = await resetPasswordAction({}, formData);

    expect(result.error).toBe("パスワードが一致しません");
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("同じパスワードへの変更の場合は専用エラーメッセージを返す", async () => {
    updateUserMock.mockResolvedValue({
      error: { code: "same_password", message: "same password" },
    });
    const { resetPasswordAction } = await import(
      "@/features/company/auth/actions/reset-password"
    );
    const formData = buildFormData({
      password: "samepassword123",
      confirmPassword: "samepassword123",
    });

    const result = await resetPasswordAction({}, formData);

    expect(result.error).toBe(
      "現在と同じパスワードには変更できません。別のパスワードを入力してください。",
    );
  });

  it("Supabase がその他のエラーを返した場合は汎用エラーメッセージを返す", async () => {
    updateUserMock.mockResolvedValue({
      error: { code: "unknown", message: "Something went wrong" },
    });
    const { resetPasswordAction } = await import(
      "@/features/company/auth/actions/reset-password"
    );
    const formData = buildFormData({
      password: "newpassword123",
      confirmPassword: "newpassword123",
    });

    const result = await resetPasswordAction({}, formData);

    expect(result.error).toBe(
      "パスワードの更新に失敗しました。リンクの有効期限が切れている可能性があります。",
    );
  });

  it("パスワード更新成功時は /company/login にリダイレクトする", async () => {
    updateUserMock.mockResolvedValue({ error: null });
    const { resetPasswordAction } = await import(
      "@/features/company/auth/actions/reset-password"
    );
    const formData = buildFormData({
      password: "newpassword123",
      confirmPassword: "newpassword123",
    });

    await expect(resetPasswordAction({}, formData)).rejects.toThrow(
      /NEXT_REDIRECT/,
    );

    expect(updateUserMock).toHaveBeenCalledWith({ password: "newpassword123" });
    expect(redirectMock).toHaveBeenCalledWith("/company/login");
  });
});
