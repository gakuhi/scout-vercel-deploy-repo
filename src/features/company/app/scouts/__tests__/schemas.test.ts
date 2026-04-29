import { describe, expect, it } from "vitest";
import { scoutMessageSchema } from "@/features/company/app/scouts/schemas";

describe("scoutMessageSchema", () => {
  const validInput = {
    subject: "特別選考のご案内",
    message: "ぜひ弊社の選考にご参加ください。",
    jobPostingId: "job-1",
    studentIds: ["student-1", "student-2"],
  };

  it("有効な入力でパースが成功する", () => {
    const result = scoutMessageSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("件名が空の場合はエラー", () => {
    const result = scoutMessageSchema.safeParse({
      ...validInput,
      subject: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("件名を入力してください");
    }
  });

  it("本文が空の場合はエラー", () => {
    const result = scoutMessageSchema.safeParse({
      ...validInput,
      message: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("本文を入力してください");
    }
  });

  it("本文が5000文字を超える場合はエラー", () => {
    const result = scoutMessageSchema.safeParse({
      ...validInput,
      message: "あ".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("求人IDが空の場合はエラー", () => {
    const result = scoutMessageSchema.safeParse({
      ...validInput,
      jobPostingId: "",
    });
    expect(result.success).toBe(false);
  });

  it("studentIds が空配列の場合はエラー", () => {
    const result = scoutMessageSchema.safeParse({
      ...validInput,
      studentIds: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "送信先の学生を1人以上選択してください",
      );
    }
  });

  it("件名が200文字を超える場合はエラー", () => {
    const result = scoutMessageSchema.safeParse({
      ...validInput,
      subject: "あ".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("studentIds が50人を超える場合はエラー", () => {
    const result = scoutMessageSchema.safeParse({
      ...validInput,
      studentIds: Array.from({ length: 51 }, (_, i) => `student-${i}`),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "一度に送信できるのは50人までです",
      );
    }
  });

  it("studentIds が50人ちょうどの場合はパースが成功する", () => {
    const result = scoutMessageSchema.safeParse({
      ...validInput,
      studentIds: Array.from({ length: 50 }, (_, i) => `student-${i}`),
    });
    expect(result.success).toBe(true);
  });
});
