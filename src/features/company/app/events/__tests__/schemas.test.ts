import { describe, expect, it } from "vitest";
import { eventSchema } from "@/features/company/app/events/schemas";

describe("eventSchema", () => {
  const validInput = {
    title: "会社説明会 2025",
    eventType: "会社説明会",
    format: "offline",
    startsAt: "2025-06-01T10:00",
    endsAt: "2025-06-01T12:00",
    location: "東京都新宿区",
    onlineUrl: "",
    description: "説明会を開催します",
    capacity: 50,
    applicationDeadline: "2025-05-25",
    targetGraduationYear: 2027,
  };

  it("有効な入力でパースが成功する", () => {
    const result = eventSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("タイトルが空の場合はエラー", () => {
    const result = eventSchema.safeParse({ ...validInput, title: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "イベント名を入力してください",
      );
    }
  });

  it("開始日時が空の場合はエラー", () => {
    const result = eventSchema.safeParse({ ...validInput, startsAt: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "開始日時を入力してください",
      );
    }
  });

  it("不正なカテゴリの場合はエラー", () => {
    const result = eventSchema.safeParse({
      ...validInput,
      eventType: "不正なカテゴリ",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "有効なカテゴリを選択してください",
      );
    }
  });

  it("不正な開催形式の場合はエラー", () => {
    const result = eventSchema.safeParse({
      ...validInput,
      format: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("空文字のオプションフィールドはnullに変換される", () => {
    const result = eventSchema.safeParse({
      ...validInput,
      eventType: "",
      endsAt: "",
      location: "",
      onlineUrl: "",
      description: "",
      applicationDeadline: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eventType).toBeNull();
      expect(result.data.endsAt).toBeNull();
      expect(result.data.location).toBeNull();
      expect(result.data.description).toBeNull();
    }
  });

  it("capacity が空文字の場合は null", () => {
    const result = eventSchema.safeParse({
      ...validInput,
      capacity: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.capacity).toBeNull();
    }
  });

  it("capacity が0以下の場合はエラー", () => {
    const result = eventSchema.safeParse({
      ...validInput,
      capacity: 0,
    });
    expect(result.success).toBe(false);
  });

  it("description が5000文字を超える場合はエラー", () => {
    const result = eventSchema.safeParse({
      ...validInput,
      description: "あ".repeat(5001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "イベント詳細は5000文字以内で入力してください",
      );
    }
  });

  it("全てのformat値が受け入れられる", () => {
    for (const fmt of ["online", "offline", "hybrid"]) {
      const result = eventSchema.safeParse({ ...validInput, format: fmt });
      expect(result.success).toBe(true);
    }
  });

  it("startsAt/endsAt の datetime-local 文字列を JST (+09:00) として正規化する", () => {
    const result = eventSchema.safeParse({
      ...validInput,
      startsAt: "2025-06-01T10:00",
      endsAt: "2025-06-01T12:00",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startsAt).toBe("2025-06-01T10:00:00+09:00");
      expect(result.data.endsAt).toBe("2025-06-01T12:00:00+09:00");
    }
  });

  it("既に秒付きの datetime-local も JST として正規化する", () => {
    const result = eventSchema.safeParse({
      ...validInput,
      startsAt: "2025-06-01T10:00:30",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startsAt).toBe("2025-06-01T10:00:30+09:00");
    }
  });
});
