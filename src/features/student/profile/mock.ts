import type { IndustryCategory } from "@/shared/constants/industries";
import type { JobCategory } from "@/shared/constants/job-categories";

/**
 * 就活活動量の 3 段階 enum。UI 表示用に activity_volume_score (0-100) から導出する。
 * 0-30=low / 31-60=medium / 61-100=high。
 */
export type ActivityLevel = "low" | "medium" | "high";

/** 統合プロフィール（仕様書 student_integrated_profiles に準拠） */
export type IntegratedProfile = {
  /** E. 人物要約 */
  summary: string;
  strengths: string[];
  skills: string[];

  /** A. 志向スコア（スペクトラム: 0-100） */
  growthStabilityScore: number | null;
  specialistGeneralistScore: number | null;
  individualTeamScore: number | null;
  autonomyGuidanceScore: number | null;

  /** B. 能力スコア（絶対: 0-100） */
  logicalThinkingScore: number | null;
  communicationScore: number | null;
  writingSkillScore: number | null;
  leadershipScore: number | null;

  /** C. 活動量スコア（相対: 0-100）。`student_integrated_profiles.activity_volume_score` */
  activityVolumeScore: number | null;

  /**
   * C. 就活活動量の 3 段階 enum。`activity_volume_score` から UI 側で導出する派生値。
   * DB には持たない。
   */
  activityLevel: ActivityLevel | null;

  /** D. 興味タグ */
  interestedIndustries: IndustryCategory[];
  interestedJobTypes: JobCategory[];

  /** メタ。プロフィール未生成時は null */
  scoreConfidence: number | null;
};

/** 各プロダクトの同期済みデータアイテム（最新 N 件） */
export type SyncedEsItem = {
  id: string;
  generatedText: string | null;
  generatedAt: string | null;
};

export type SyncedResearchItem = {
  id: string;
  title: string | null;
  url: string | null;
  originalCreatedAt: string | null;
};

export type SyncedInterviewItem = {
  id: string;
  companyName: string | null;
  sessionType: string | null;
  overallScore: number | null;
  startedAt: string | null;
};

export type SyncedSugoshuItem = {
  id: string;
  kind: "resume" | "diagnosis";
  contentPreview: string | null;
  originalCreatedAt: string | null;
};

export type SyncedItems = {
  es: SyncedEsItem[];
  researches: SyncedResearchItem[];
  interviewSessions: SyncedInterviewItem[];
  sugoshu: SyncedSugoshuItem[];
};

export type ProfileMock = {
  name: string;
  university: string;
  faculty: string;
  /** 学科。未設定時は空文字 */
  department: string;
  /** 住まいの都道府県。未設定時は空文字 */
  prefecture: string;
  graduationYear: number | null;
  avatarInitials: string;
  profileImageUrl?: string | null;
  email: string;
  phone: string;
  bio: string;
  /** プレビュー画面の公開ガードに使用 */
  isProfilePublic: boolean;
  /** MBTI の type_code (例: "INTJ")。未設定は null */
  mbtiTypeCode: string | null;
  /** MBTI の日本語名 (例: "建築家")。未設定は null。プレビュー画面では「性格タイプ」として表示 */
  mbtiTypeName: string | null;
  integratedProfile: IntegratedProfile;
  productCounts: {
    label: string;
    icon: string;
    value: number;
  }[];
  syncedItems: SyncedItems;
  scoutSettings: {
    label: string;
    value: string;
    highlight?: boolean;
  }[];
  verifiedAt: string;
};

export const profileMock: ProfileMock = {
  name: "佐藤 健太",
  university: "東京未来大学",
  faculty: "経済学部",
  department: "経済学科",
  prefecture: "東京都",
  graduationYear: 2026,
  avatarInitials: "SK",
  email: "k.sato@example.com",
  phone: "080-1234-5678",
  isProfilePublic: true,
  mbtiTypeCode: "INTJ",
  mbtiTypeName: "建築家",
  bio: "大学時代は、データに基づいた意思決定を重視し、学生団体の運営において前年比150%の参加者数増を達成しました。単なる数字の追求ではなく、その裏側にある「人の動機」を深く理解し、それに基づいた仕組み作りを行うことに情熱を持っています。将来は、日本の伝統的な産業をテクノロジーの力でアップデートする役割を担いたいと考えています。",
  integratedProfile: {
    summary:
      "論理性が高く、長期的な成長を重視する学生。ガクチカでデータ分析サークルのリーダー経験があり、IT業界の大手3社を集中的に研究している。面接練習では論理構造力のスコアが高く、企業分析では成長環境に関する質問が多い。",
    strengths: ["論理的思考", "リーダーシップ", "データ分析"],
    skills: ["Python", "SQL", "データ分析", "プレゼンテーション"],
    growthStabilityScore: 82,
    specialistGeneralistScore: 65,
    individualTeamScore: 45,
    autonomyGuidanceScore: 70,
    logicalThinkingScore: 75,
    communicationScore: 68,
    writingSkillScore: 72,
    leadershipScore: 60,
    activityVolumeScore: 85,
    activityLevel: "high",
    interestedIndustries: [
      "it_software",
      "consulting",
      "finance",
      "advertising_media",
      "manufacturing",
    ],
    interestedJobTypes: ["planning", "consultant", "engineer_it"],
    scoreConfidence: 75,
  },
  productCounts: [
    { label: "ESデータ", icon: "description", value: 12 },
    { label: "企業分析", icon: "analytics", value: 45 },
    { label: "面接練習", icon: "record_voice_over", value: 8 },
    { label: "すごい就活", icon: "description", value: 6 },
  ],
  syncedItems: {
    es: [
      {
        id: "es-1",
        generatedText:
          "私の強みは、データに基づいて仮説を立て検証するプロセスを粘り強く継続できる点です。学生団体のイベント運営で前年比150%の参加者増を達成しました。",
        generatedAt: "2026-03-12T10:00:00Z",
      },
      {
        id: "es-2",
        generatedText: "学生時代に最も力を入れたのはデータ分析サークルの運営です。30人のメンバーをまとめ、月1回の勉強会を企画運営しました。",
        generatedAt: "2026-03-05T10:00:00Z",
      },
    ],
    researches: [
      {
        id: "res-1",
        title: "トヨタ自動車の海外戦略と新興国市場での動向",
        url: "https://example.com/toyota-research",
        originalCreatedAt: "2026-03-15T09:00:00Z",
      },
      {
        id: "res-2",
        title: "ソニーグループの事業ポートフォリオ分析",
        url: "https://example.com/sony-research",
        originalCreatedAt: "2026-03-10T09:00:00Z",
      },
    ],
    interviewSessions: [
      {
        id: "int-1",
        companyName: "株式会社サンプル",
        sessionType: "technical",
        overallScore: 82,
        startedAt: "2026-03-18T14:00:00Z",
      },
      {
        id: "int-2",
        companyName: "サンプル商事",
        sessionType: "behavioral",
        overallScore: 75,
        startedAt: "2026-03-08T14:00:00Z",
      },
    ],
    sugoshu: [
      {
        id: "sug-1",
        kind: "resume",
        contentPreview: "東京未来大学 経済学部 経済学科 在学中。データ分析サークル所属、TOEIC 850点。",
        originalCreatedAt: "2026-03-20T11:00:00Z",
      },
      {
        id: "sug-2",
        kind: "diagnosis",
        contentPreview: "志向性: 成長重視 / スキル傾向: 論理的思考",
        originalCreatedAt: "2026-02-28T11:00:00Z",
      },
    ],
  },
  scoutSettings: [
    { label: "スカウト受取", value: "ON", highlight: true },
    { label: "希望年収（初年度）", value: "450万円〜" },
    { label: "希望勤務地", value: "東京・神奈川" },
    { label: "ポートフォリオ公開", value: "限定公開" },
  ],
  verifiedAt: "2024.11",
};
