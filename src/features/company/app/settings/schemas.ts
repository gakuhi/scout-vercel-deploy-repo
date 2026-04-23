import { z } from "zod";
import { industrySchema } from "@/shared/constants/industries";
import { prefectureSchema } from "@/shared/constants/prefectures";

const emptyToNull = (v: unknown) => (v === "" ? null : v);

export const EMPLOYEE_COUNT_RANGES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5000+",
] as const;

export const companySettingsFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "会社名を入力してください")
    .max(200),
  industry: z.preprocess(emptyToNull, industrySchema.nullable().optional()),
  employeeCountRange: z.preprocess(
    emptyToNull,
    z.enum(EMPLOYEE_COUNT_RANGES).nullable().optional(),
  ),
  websiteUrl: z.preprocess(
    emptyToNull,
    z.string().trim().url("有効なURLを入力してください").nullable().optional(),
  ),
  description: z.preprocess(
    emptyToNull,
    z.string().trim().max(4000).nullable().optional(),
  ),
  prefecture: z.preprocess(emptyToNull, prefectureSchema.nullable().optional()),
  postalCode: z.preprocess(
    emptyToNull,
    z.string().trim().max(16).nullable().optional(),
  ),
  city: z.preprocess(
    emptyToNull,
    z.string().trim().max(80).nullable().optional(),
  ),
  street: z.preprocess(
    emptyToNull,
    z.string().trim().max(200).nullable().optional(),
  ),
  phone: z.preprocess(
    emptyToNull,
    z.string().trim().max(32).nullable().optional(),
  ),
});

export type CompanySettingsFormInput = z.infer<typeof companySettingsFormSchema>;
