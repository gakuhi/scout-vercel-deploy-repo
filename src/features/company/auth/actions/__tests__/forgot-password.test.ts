import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resetPasswordForEmailMock = vi.fn();
const createClientMock = vi.fn(() => ({
  auth: {
    resetPasswordForEmail: resetPasswordForEmailMock,
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

beforeEach(() => {
  resetPasswordForEmailMock.mockReset();
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

describe("forgotPasswordAction", () => {
  it("メールアドレスが不正な形式の場合は validation エラーを返す", async () => {
    const { forgotPasswordAction } = await import(
      "@/features/company/auth/actions/forgot-password"
    );
    const formData = buildFormData({ email: "not-an-email" });

    const result = await forgotPasswordAction({}, formData);

    expect(result.error).toBe("有効なメールアドレスを入力してください");
    expect(resetPasswordForEmailMock).not.toHaveBeenCalled();
  });

  it("メールアドレスが空の場合は validation エラーを返す", async () => {
    const { forgotPasswordAction } = await import(
      "@/features/company/auth/actions/forgot-password"
    );
    const formData = buildFormData({ email: "" });

    const result = await forgotPasswordAction({}, formData);

    expect(result.error).toBeDefined();
    expect(resetPasswordForEmailMock).not.toHaveBeenCalled();
  });

  it("Supabase がエラーを返した場合はエラーメッセージを返す", async () => {
    resetPasswordForEmailMock.mockResolvedValue({
      error: { message: "Rate limit exceeded" },
    });
    const { forgotPasswordAction } = await import(
      "@/features/company/auth/actions/forgot-password"
    );
    const formData = buildFormData({ email: "user@example.com" });

    const result = await forgotPasswordAction({}, formData);

    expect(result.error).toBe(
      "リセットメールの送信に失敗しました。時間を置いて再度お試しください。",
    );
  });

  it("正常にリセットメールを送信できた場合は success: true を返す", async () => {
    resetPasswordForEmailMock.mockResolvedValue({ error: null });
    const { forgotPasswordAction } = await import(
      "@/features/company/auth/actions/forgot-password"
    );
    const formData = buildFormData({ email: "user@example.com" });

    const result = await forgotPasswordAction({}, formData);

    expect(result).toEqual({ success: true });
    expect(resetPasswordForEmailMock).toHaveBeenCalledWith("user@example.com", {
      redirectTo: "http://127.0.0.1:3000/company/reset-password",
    });
  });
});
