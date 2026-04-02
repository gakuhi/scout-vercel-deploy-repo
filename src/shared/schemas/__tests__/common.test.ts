import { describe, it, expect } from "vitest";
import { emailSchema, passwordSchema, urlSchema } from "../common";

describe("emailSchema", () => {
  it("有効なメールアドレスを受け入れる", () => {
    expect(emailSchema.safeParse("user@example.com").success).toBe(true);
  });

  it("無効なメールアドレスを拒否する", () => {
    const result = emailSchema.safeParse("not-an-email");
    expect(result.success).toBe(false);
  });

  it("空文字を拒否する", () => {
    const result = emailSchema.safeParse("");
    expect(result.success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("12文字以上のパスワードを受け入れる", () => {
    expect(passwordSchema.safeParse("abcdefghijkl").success).toBe(true);
  });

  it("12文字未満のパスワードを拒否する", () => {
    const result = passwordSchema.safeParse("short");
    expect(result.success).toBe(false);
  });

  it("ちょうど12文字のパスワードを受け入れる", () => {
    expect(passwordSchema.safeParse("123456789012").success).toBe(true);
  });

  it("11文字のパスワードを拒否する", () => {
    const result = passwordSchema.safeParse("12345678901");
    expect(result.success).toBe(false);
  });
});

describe("urlSchema", () => {
  it("有効なURLを受け入れる", () => {
    expect(urlSchema.safeParse("https://example.com").success).toBe(true);
  });

  it("無効なURLを拒否する", () => {
    const result = urlSchema.safeParse("not-a-url");
    expect(result.success).toBe(false);
  });
});
