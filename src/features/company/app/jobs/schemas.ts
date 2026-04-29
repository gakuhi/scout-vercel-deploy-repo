import { z } from "zod";
import { INDUSTRY_CATEGORIES } from "./industry-data";
import { ALL_JOB_TYPES } from "./job-type-data";

const allSubcategories = INDUSTRY_CATEGORIES.flatMap((c) => c.subcategories);

export const EMPLOYMENT_TYPES = [
  "正社員",
  "契約社員",
] as const;

const emptyToNull = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? null : val),
  z.string().nullable(),
);

const titleSchema = z
  .string()
  .trim()
  .min(1, "求人タイトルを入力してください")
  .max(200, "求人タイトルは200文字以内で入力してください");

const toYearArray = (raw: unknown[]): number[] =>
  raw
    .filter((v) => !(typeof v === "string" && v.trim() === ""))
    .map(Number)
    .filter((n) => !Number.isNaN(n));

const targetGraduationYearsSchema = z.preprocess(
  (val) => {
    if (Array.isArray(val)) return toYearArray(val);
    if (typeof val === "string") return toYearArray(val.split(","));
    return [];
  },
  z.array(z.number().int().min(2020).max(2040)),
);

// 公開用: タイトルに加え全項目が必須
export const jobPostingSchema = z.object({
  title: titleSchema,
  jobType: z
    .string()
    .trim()
    .min(1, "職種を選択してください")
    .refine((val) => ALL_JOB_TYPES.includes(val), "有効な職種を選択してください"),
  jobCategory: z
    .string()
    .trim()
    .min(1, "業種を選択してください")
    .refine(
      (val) => allSubcategories.includes(val),
      "有効な業種を選択してください",
    ),
  employmentType: z
    .string()
    .trim()
    .min(1, "雇用形態を選択してください")
    .refine(
      (val) => EMPLOYMENT_TYPES.includes(val as typeof EMPLOYMENT_TYPES[number]),
      "有効な雇用形態を選択してください",
    ),
  salaryRange: z.string().trim().min(1, "給与を選択してください"),
  workLocation: z.string().trim().min(1, "勤務地を選択してください"),
  description: z
    .string()
    .trim()
    .min(1, "仕事内容を入力してください")
    .max(5000, "仕事内容は5000文字以内で入力してください"),
  requirements: z
    .string()
    .trim()
    .min(1, "応募要件を入力してください")
    .max(5000, "応募要件は5000文字以内で入力してください"),
  benefits: z
    .string()
    .trim()
    .min(1, "福利厚生を入力してください")
    .max(5000, "福利厚生は5000文字以内で入力してください"),
  targetGraduationYears: targetGraduationYearsSchema.pipe(
    z.array(z.number()).min(1, "対象卒業年度を1つ以上選択してください"),
  ),
});

// 下書き用: タイトルのみ必須、それ以外は空でも可（ただし入力された値は形式チェック）
export const jobPostingDraftSchema = z.object({
  title: titleSchema,
  jobType: emptyToNull.refine(
    (val) => val === null || ALL_JOB_TYPES.includes(val),
    "有効な職種を選択してください",
  ),
  jobCategory: emptyToNull.refine(
    (val) => val === null || allSubcategories.includes(val),
    "有効な業種を選択してください",
  ),
  employmentType: emptyToNull.refine(
    (val) =>
      val === null ||
      EMPLOYMENT_TYPES.includes(val as typeof EMPLOYMENT_TYPES[number]),
    "有効な雇用形態を選択してください",
  ),
  salaryRange: emptyToNull,
  workLocation: emptyToNull,
  description: emptyToNull.refine(
    (val) => val === null || val.length <= 5000,
    "仕事内容は5000文字以内で入力してください",
  ),
  requirements: emptyToNull.refine(
    (val) => val === null || val.length <= 5000,
    "応募要件は5000文字以内で入力してください",
  ),
  benefits: emptyToNull.refine(
    (val) => val === null || val.length <= 5000,
    "福利厚生は5000文字以内で入力してください",
  ),
  targetGraduationYears: targetGraduationYearsSchema,
});

export type JobPostingInput = z.infer<typeof jobPostingDraftSchema>;
