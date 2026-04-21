/** 業界カテゴリ（仕様書 industry_category に準拠） */
export type IndustryCategory =
  | "it_software"
  | "consulting"
  | "finance"
  | "trading_company"
  | "manufacturing"
  | "advertising_media"
  | "retail_service"
  | "real_estate"
  | "infrastructure"
  | "public_sector"
  | "other";

/** 職種カテゴリ（仕様書 job_category に準拠） */
export type JobCategory =
  | "engineer_it"
  | "engineer_other"
  | "designer"
  | "sales"
  | "marketing"
  | "planning"
  | "corporate"
  | "consultant"
  | "research"
  | "other";

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

/**
 * 就活活動量（student_integrated_profiles.activity_level の enum）。
 * プレビュー画面の「就活活動量」カードで表示する。
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

  /** C. 活動量スコア（相対: 0-100） — レガシー。プレビューでは activityLevel を使用する */
  activityVolumeScore: number | null;

  /**
   * C. 就活活動量（`student_integrated_profiles.activity_level` の 3 段階 enum）。
   * プレビュー画面ではこちらを表示する。
   */
  activityLevel: ActivityLevel | null;

  /** D. 興味タグ */
  interestedIndustries: IndustryCategory[];
  interestedJobTypes: JobCategory[];

  /** メタ */
  scoreConfidence: number;
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
    { label: "活動一覧", icon: "format_list_bulleted", value: 24 },
  ],
  scoutSettings: [
    { label: "スカウト受取", value: "ON", highlight: true },
    { label: "希望年収（初年度）", value: "450万円〜" },
    { label: "希望勤務地", value: "東京・神奈川" },
    { label: "ポートフォリオ公開", value: "限定公開" },
  ],
  verifiedAt: "2024.11",
};
