import { z } from "zod";

export const ACADEMIC_TYPES = ["liberal_arts", "science", "other"] as const;
export type AcademicType = (typeof ACADEMIC_TYPES)[number];

export const ACADEMIC_TYPE_LABELS: Record<AcademicType, string> = {
  liberal_arts: "文系",
  science: "理系",
  other: "その他",
};

export const REGIONS = [
  "tokyo",
  "kanto_except_tokyo",
  "kansai",
  "chubu_tokai",
  "hokkaido_tohoku",
  "chugoku_shikoku",
  "kyushu_okinawa",
  "overseas",
  "remote_ok",
] as const;
export type Region = (typeof REGIONS)[number];

export const REGION_LABELS: Record<Region, string> = {
  tokyo: "東京",
  kanto_except_tokyo: "関東（東京以外）",
  kansai: "関西",
  chubu_tokai: "中部・東海",
  hokkaido_tohoku: "北海道・東北",
  chugoku_shikoku: "中国・四国",
  kyushu_okinawa: "九州・沖縄",
  overseas: "海外",
  remote_ok: "リモート可",
};

// A. 志向・価値観スコア（スペクトラム: 0側と100側に両方意味がある）
export const ORIENTATION_SCORES = [
  {
    key: "growthStability",
    label: "成長 - 安定",
    lowLabel: "安定・待遇重視",
    highLabel: "成長・挑戦重視",
  },
  {
    key: "specialistGeneralist",
    label: "専門 - 汎用",
    lowLabel: "ゼネラリスト志向",
    highLabel: "スペシャリスト志向",
  },
  {
    key: "individualTeam",
    label: "個人 - チーム",
    lowLabel: "個人で成果を出す",
    highLabel: "チームで成果を出す",
  },
  {
    key: "autonomyGuidance",
    label: "裁量 - 指導",
    lowLabel: "手厚い指導を求める",
    highLabel: "裁量を求める",
  },
] as const;

// B. 能力スコア（絶対: 高いほど能力が高い）
export const ABILITY_SCORES = [
  { key: "logicalThinking", label: "論理的思考力" },
  { key: "communication", label: "コミュニケーション力" },
  { key: "writingSkill", label: "文章表現力" },
  { key: "leadership", label: "リーダーシップ" },
] as const;

const scoreRange = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return null;
    const num = Number(val);
    return Number.isNaN(num) ? null : num;
  },
  z.number().int().min(0).max(100).nullable(),
);

export const searchFilterSchema = z.object({
  // Layer 1: 構造化フィルタ
  graduationYear: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return null;
      const num = Number(val);
      return Number.isNaN(num) ? null : num;
    },
    z.number().int().min(2020).max(2040).nullable(),
  ),
  academicTypes: z.array(z.enum(ACADEMIC_TYPES)).default([]),
  regions: z.array(z.enum(REGIONS)).default([]),
  minConfidence: scoreRange,

  // Layer 3: スコアフィルタ
  // A. 志向スコア（希望値 — 距離計算でソートに使用）
  wantGrowthStability: scoreRange,
  wantSpecialistGeneralist: scoreRange,
  wantIndividualTeam: scoreRange,
  wantAutonomyGuidance: scoreRange,
  // B. 能力スコア（最低値フィルタ — 高いほど良い）
  minLogicalThinking: scoreRange,
  minCommunication: scoreRange,
  minWritingSkill: scoreRange,
  minLeadership: scoreRange,
  // C. 活動量（最低値フィルタ）
  minActivityVolume: scoreRange,
});

export type SearchFilter = z.infer<typeof searchFilterSchema>;
