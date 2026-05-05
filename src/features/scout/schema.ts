/** DB の scout_status + 既読判定を UI 向けに統合した表示用ステータス。 */
export type ScoutDisplayStatus =
  | "new" // sent + 未読
  | "read" // sent + 既読
  | "accepted" // accepted
  | "declined" // declined
  | "expired"; // expired

// ScoutItem 内の nested 型。外部からは ScoutItem["company"] / ScoutItem["job"]
// 経由でアクセスする想定なので非 export にして公開面を狭める。
type ScoutCompany = {
  name: string;
  logoUrl: string | null;
  industry: string | null;
  description: string | null;
  /** 社風・風土。companies.culture 由来の自由記述。 */
  culture: string | null;
  /**
   * 社風セクションのカルーセルに出す職場風景写真。
   * DB に画像カラムが追加されるまでは mock のみで設定し、
   * 実データ経路では undefined のまま（CulturePhotoGrid 側で非表示）。
   */
  culturePhotos?: ReadonlyArray<{ url: string; caption: string }>;
  employeeCountRange: string | null;
  websiteUrl: string | null;
};

type ScoutJob = {
  title: string;
  description: string | null;
  requirements: string | null;
  benefits: string | null;
  // 以下は job_postings 側の任意カラム由来。未設定の求人もあり得るため optional。
  jobType?: string | null;
  jobCategory?: string | null;
  workLocation?: string | null;
  employmentType?: string | null;
  salaryRange?: string | null;
  /** 対象卒業年度（複数）。job_postings.target_graduation_years (INT[]) 由来。 */
  targetGraduationYears?: number[];
  /** 求人トップ画像の署名 URL。サーバ側で hero_image_path から解決して渡す。 */
  heroImageUrl?: string | null;
};

export type ScoutItem = {
  id: string;
  subject: string;
  message: string;
  sentAt: string;
  expiresAt: string | null;
  status: ScoutDisplayStatus;
  isFavorite: boolean;
  senderName: string | null;
  company: ScoutCompany;
  job: ScoutJob;
};

export type TagStyle = {
  label: string;
  bgClass: string;
  textClass: string;
};

/** 新着（24h 以内）タグ — 任意のステータスと併存しうる。 */
export const FRESH_TAG: TagStyle = {
  label: "新着",
  bgClass: "bg-tertiary-fixed",
  textClass: "text-tertiary-container",
};

/** 未読タグ — status === "new" のときに表示。 */
export const UNREAD_TAG: TagStyle = {
  label: "未読",
  bgClass: "bg-primary-container",
  textClass: "text-white",
};

/** responded / expired を表すバッジ。new/read のときは使用しない（代わりに上の 2 タグで表現）。 */
export const RESOLVED_BADGE: Record<
  Extract<ScoutDisplayStatus, "accepted" | "declined" | "expired">,
  TagStyle
> = {
  accepted: {
    label: "承諾済み",
    bgClass: "bg-secondary-container",
    textClass: "text-on-secondary-container",
  },
  declined: {
    label: "辞退",
    bgClass: "bg-error-container",
    textClass: "text-on-error-container",
  },
  expired: {
    label: "期限切れ",
    bgClass: "bg-surface-container",
    textClass: "text-outline",
  },
};

/** sentAt が 24 時間以内かどうか判定。 */
export function isFresh(sentAt: string): boolean {
  const sent = new Date(sentAt);
  if (Number.isNaN(sent.getTime())) return false;
  const oneDayMs = 24 * 60 * 60 * 1000;
  return Date.now() - sent.getTime() < oneDayMs;
}
