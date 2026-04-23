import { z } from "zod";

export const INDUSTRY_CATEGORIES = [
  "it_software",
  "consulting",
  "finance",
  "trading_company",
  "manufacturing",
  "advertising_media",
  "retail_service",
  "real_estate",
  "infrastructure",
  "public_sector",
  "other",
] as const;

export type IndustryCategory = (typeof INDUSTRY_CATEGORIES)[number];

export const industryLabels: Record<IndustryCategory, string> = {
  it_software: "IT・ソフトウェア",
  consulting: "コンサル",
  finance: "金融",
  trading_company: "商社",
  manufacturing: "メーカー",
  advertising_media: "広告・メディア",
  retail_service: "小売・サービス",
  real_estate: "不動産・建設",
  infrastructure: "インフラ",
  public_sector: "公務員・教育・医療",
  other: "その他",
};

export const industrySchema = z.enum(INDUSTRY_CATEGORIES);
