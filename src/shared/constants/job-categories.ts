import { z } from "zod";

export const JOB_CATEGORIES = [
  "engineer_it",
  "engineer_other",
  "designer",
  "sales",
  "marketing",
  "planning",
  "corporate",
  "consultant",
  "research",
  "other",
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];

export const jobCategoryLabels: Record<JobCategory, string> = {
  engineer_it: "ITエンジニア",
  engineer_other: "技術職",
  designer: "デザイナー",
  sales: "営業",
  marketing: "マーケティング",
  planning: "企画・事業開発",
  corporate: "コーポレート",
  consultant: "コンサルタント",
  research: "研究職",
  other: "その他",
};

export const jobCategorySchema = z.enum(JOB_CATEGORIES);
