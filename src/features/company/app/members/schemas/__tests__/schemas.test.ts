import { describe, expect, it } from "vitest";
import { inviteMemberSchema } from "@/features/company/app/members/schemas";

describe("inviteMemberSchema", () => {
  const validInput = {
    lastName: "山田",
    firstName: "太郎",
    email: "taro@example.com",
    role: "admin" as const,
  };

  it("有効な入力でパースが成功する", () => {
    const result = inviteMemberSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("role が member でもパースが成功する", () => {
    const result = inviteMemberSchema.safeParse({
      ...validInput,
      role: "member",
    });
    expect(result.success).toBe(true);
  });

  it("姓が空文字の場合はエラーを返す", () => {
    const result = inviteMemberSchema.safeParse({
      ...validInput,
      lastName: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("姓を入力してください");
    }
  });

  it("姓がスペースのみの場合はエラーを返す（trimされる）", () => {
    const result = inviteMemberSchema.safeParse({
      ...validInput,
      lastName: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("名が空文字の場合はエラーを返す", () => {
    const result = inviteMemberSchema.safeParse({
      ...validInput,
      firstName: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("名を入力してください");
    }
  });

  it("メールアドレスが不正な形式の場合はエラーを返す", () => {
    const result = inviteMemberSchema.safeParse({
      ...validInput,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "有効なメールアドレスを入力してください",
      );
    }
  });

  it("ロールが owner の場合はエラーを返す（admin / member のみ許可）", () => {
    const result = inviteMemberSchema.safeParse({
      ...validInput,
      role: "owner",
    });
    expect(result.success).toBe(false);
  });

  it("姓が80文字を超える場合はエラーを返す", () => {
    const result = inviteMemberSchema.safeParse({
      ...validInput,
      lastName: "あ".repeat(81),
    });
    expect(result.success).toBe(false);
  });

  it("姓が80文字ちょうどの場合はパースが成功する", () => {
    const result = inviteMemberSchema.safeParse({
      ...validInput,
      lastName: "あ".repeat(80),
    });
    expect(result.success).toBe(true);
  });
});
