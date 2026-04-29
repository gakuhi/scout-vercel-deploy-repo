import { describe, expect, it } from "vitest";
import { searchFilterSchema } from "@/features/company/app/students/schemas";

describe("searchFilterSchema", () => {
  it("すべて空でパースが成功する（デフォルト値）", () => {
    const result = searchFilterSchema.safeParse({
      graduationYear: "",
      academicTypes: [],
      regions: [],
      minConfidence: "",
      wantGrowthStability: "",
      minLogicalThinking: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.graduationYear).toBeNull();
      expect(result.data.academicTypes).toEqual([]);
      expect(result.data.minConfidence).toBeNull();
    }
  });

  it("有効な卒業年度とフィルタでパースが成功する", () => {
    const result = searchFilterSchema.safeParse({
      graduationYear: 2027,
      academicTypes: ["science"],
      regions: ["tokyo"],
      minConfidence: 50,
      wantGrowthStability: 70,
      minLogicalThinking: 60,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.graduationYear).toBe(2027);
      expect(result.data.academicTypes).toEqual(["science"]);
      expect(result.data.minConfidence).toBe(50);
      expect(result.data.minLogicalThinking).toBe(60);
    }
  });

  it("不正な academicType の場合はエラー", () => {
    const result = searchFilterSchema.safeParse({
      graduationYear: "",
      academicTypes: ["invalid"],
      regions: [],
    });
    expect(result.success).toBe(false);
  });

  it("不正な region の場合はエラー", () => {
    const result = searchFilterSchema.safeParse({
      graduationYear: "",
      academicTypes: [],
      regions: ["mars"],
    });
    expect(result.success).toBe(false);
  });

  it("卒業年度が範囲外の場合はエラー", () => {
    const result = searchFilterSchema.safeParse({
      graduationYear: 2019,
      academicTypes: [],
      regions: [],
    });
    expect(result.success).toBe(false);
  });

  it("スコアが0-100の範囲外の場合はエラー", () => {
    const result = searchFilterSchema.safeParse({
      graduationYear: "",
      academicTypes: [],
      regions: [],
      minLogicalThinking: 101,
    });
    expect(result.success).toBe(false);
  });

  it("スコアが0の場合はパースが成功する", () => {
    const result = searchFilterSchema.safeParse({
      graduationYear: "",
      academicTypes: [],
      regions: [],
      wantGrowthStability: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.wantGrowthStability).toBe(0);
    }
  });

  it("複数の academicType を選択できる", () => {
    const result = searchFilterSchema.safeParse({
      graduationYear: "",
      academicTypes: ["liberal_arts", "science"],
      regions: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.academicTypes).toEqual(["liberal_arts", "science"]);
    }
  });
});
