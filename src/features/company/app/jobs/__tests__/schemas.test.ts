import { describe, expect, it } from "vitest";
import {
  jobPostingDraftSchema,
  jobPostingSchema,
} from "@/features/company/app/jobs/schemas";

describe("jobPostingSchema", () => {
  const validInput = {
    title: "戦略コンサルタント",
    jobType: "経営コンサルタント",
    jobCategory: "ソフトウエア",
    employmentType: "正社員",
    salaryRange: "年収 400万〜600万円",
    workLocation: "東京都千代田区",
    description: "戦略立案を担当します",
    requirements: "MBA取得者歓迎",
    benefits: "フレックスタイム制",
    targetGraduationYears: [2027, 2028],
  };

  it("有効な入力でパースが成功する", () => {
    const result = jobPostingSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("タイトルが空の場合はエラー", () => {
    const result = jobPostingSchema.safeParse({ ...validInput, title: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "求人タイトルを入力してください",
      );
    }
  });

  it("タイトルが200文字を超える場合はエラー", () => {
    const result = jobPostingSchema.safeParse({
      ...validInput,
      title: "あ".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("必須フィールドが空文字の場合はエラーになる", () => {
    const fields = [
      ["jobType", "職種を選択してください"],
      ["jobCategory", "業種を選択してください"],
      ["employmentType", "雇用形態を選択してください"],
      ["salaryRange", "給与を選択してください"],
      ["workLocation", "勤務地を選択してください"],
      ["description", "仕事内容を入力してください"],
      ["requirements", "応募要件を入力してください"],
      ["benefits", "福利厚生を入力してください"],
    ] as const;

    for (const [field, message] of fields) {
      const result = jobPostingSchema.safeParse({
        ...validInput,
        [field]: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(message);
      }
    }
  });

  it("targetGraduationYears が空配列の場合はエラー", () => {
    const result = jobPostingSchema.safeParse({
      ...validInput,
      targetGraduationYears: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "対象卒業年度を1つ以上選択してください",
      );
    }
  });

  it("targetGraduationYears がカンマ区切り文字列でもパースできる", () => {
    const result = jobPostingSchema.safeParse({
      ...validInput,
      targetGraduationYears: "2027,2028",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetGraduationYears).toEqual([2027, 2028]);
    }
  });

  it("targetGraduationYears に範囲外の値がある場合はエラー", () => {
    const result = jobPostingSchema.safeParse({
      ...validInput,
      targetGraduationYears: [2019],
    });
    expect(result.success).toBe(false);
  });

  it("jobType が有効な職種の場合はパースが成功する", () => {
    const result = jobPostingSchema.safeParse({
      ...validInput,
      jobType: "システムエンジニア",
    });
    expect(result.success).toBe(true);
  });

  it("jobType が無効な値の場合はエラー", () => {
    const result = jobPostingSchema.safeParse({
      ...validInput,
      jobType: "存在しない職種",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("有効な職種を選択してください");
    }
  });

  it("jobCategory が業種リストに含まれない値の場合はエラー", () => {
    const result = jobPostingSchema.safeParse({
      ...validInput,
      jobCategory: "存在しない業種",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "有効な業種を選択してください",
      );
    }
  });

  it("jobCategory が有効な業種の場合はパースが成功する", () => {
    const result = jobPostingSchema.safeParse({
      ...validInput,
      jobCategory: "インターネット関連",
    });
    expect(result.success).toBe(true);
  });

  it("employmentType が許可されていない値の場合はエラー", () => {
    const result = jobPostingSchema.safeParse({
      ...validInput,
      employmentType: "アルバイト",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "有効な雇用形態を選択してください",
      );
    }
  });

  it("employmentType が契約社員の場合はパースが成功する", () => {
    const result = jobPostingSchema.safeParse({
      ...validInput,
      employmentType: "契約社員",
    });
    expect(result.success).toBe(true);
  });

  it("description が5000文字を超える場合はエラー", () => {
    const result = jobPostingSchema.safeParse({
      ...validInput,
      description: "あ".repeat(5001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "仕事内容は5000文字以内で入力してください",
      );
    }
  });

  it("description が5000文字ちょうどの場合はパースが成功する", () => {
    const result = jobPostingSchema.safeParse({
      ...validInput,
      description: "あ".repeat(5000),
    });
    expect(result.success).toBe(true);
  });
});

describe("jobPostingDraftSchema", () => {
  const minimalInput = {
    title: "下書きタイトル",
    jobType: "",
    jobCategory: "",
    employmentType: "",
    salaryRange: "",
    workLocation: "",
    description: "",
    requirements: "",
    benefits: "",
    targetGraduationYears: [],
  };

  it("タイトルのみでパースが成功する", () => {
    const result = jobPostingDraftSchema.safeParse(minimalInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jobType).toBeNull();
      expect(result.data.jobCategory).toBeNull();
      expect(result.data.employmentType).toBeNull();
      expect(result.data.targetGraduationYears).toEqual([]);
    }
  });

  it("タイトルが空の場合はエラー", () => {
    const result = jobPostingDraftSchema.safeParse({
      ...minimalInput,
      title: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "求人タイトルを入力してください",
      );
    }
  });

  it("値が入っている場合は形式チェックが行われる（不正な雇用形態）", () => {
    const result = jobPostingDraftSchema.safeParse({
      ...minimalInput,
      employmentType: "アルバイト",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "有効な雇用形態を選択してください",
      );
    }
  });

  it("description が5000文字を超える場合はエラー", () => {
    const result = jobPostingDraftSchema.safeParse({
      ...minimalInput,
      description: "あ".repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});
