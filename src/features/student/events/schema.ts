export type EventBadge = "exclusive" | "online" | "offline" | "hybrid";

export type EventLocationKind = "offline" | "online" | "hybrid";

/**
 * イベントカテゴリ。企業側のイベント作成画面 (`feat/company-events` の
 * `EVENT_TYPES`) と完全に一致させる。DB の `events.event_type` 列に保存されるのは
 * このいずれかの文字列。
 */
export const EVENT_CATEGORIES = [
  "会社説明会",
  "合同企業説明会",
  "インターンシップ",
  "セミナー",
  "その他",
] as const;
export type EventCategoryKey = (typeof EVENT_CATEGORIES)[number];

/**
 * 職種カテゴリ。各イベントが対象とする職種をタグとして保持する。
 * 空配列のときは「全職種対象」とみなす（フィルタ時はどの職種でもヒットする）。
 */
export const JOB_TYPES = [
  "エンジニア",
  "デザイナー",
  "ビジネス",
  "コンサル",
  "金融",
] as const;
export type JobTypeKey = (typeof JOB_TYPES)[number];

/** フィルタタグの選択肢。開催形式 (online/offline/hybrid)・申込状態・内容カテゴリを横断する。 */
export type EventFilterKey =
  | "all"
  | "applied"
  | "online"
  | "offline"
  | "hybrid"
  | EventCategoryKey;

/** 申込枠・締切から導出されるイベントの受付状態。 */
export type EventAvailabilityStatus =
  | "open"
  | "nearly_full"
  | "full"
  | "closed";

export type EventAvailability = {
  status: EventAvailabilityStatus;
  /** 残席数。定員 null のイベントは null。 */
  remainingCapacity: number | null;
  /** 総定員。null は制限なし。 */
  capacity: number | null;
  /** 表示用フォーマット済み締切文字列（例: "2026.06.30"）。未設定は null。 */
  deadlineLabel: string | null;
  /** 申込 UI をブロックすべきか（full / closed の場合 true）。 */
  isBlocked: boolean;
};

export type EventItem = {
  id: string;
  title: string;
  /** 例: "2026.05.20" */
  dateLabel: string;
  /** 例: "Offline (Tokyo)" / "Virtual Meeting" */
  locationLabel: string;
  /** 左カラムに出すアイコンの切替用。 */
  locationKind: EventLocationKind;
  badge: EventBadge;
  imageUrl: string;
  category: EventCategoryKey;
  /** 対象職種。空配列は「全職種対象」。 */
  jobTypes: JobTypeKey[];
  /** 定員。null は制限なし。 */
  capacity: number | null;
  /** 残席。capacity が null なら null で良い。 */
  remainingCapacity: number | null;
  /** 申込期限 (ISO date "YYYY-MM-DD")。null は期限なし。 */
  applicationDeadline: string | null;
  /**
   * "おすすめ" として一覧上部に固定表示するフラグ。
   * 登壇者・タイムテーブル・地図など詳細情報が充実しているイベントを目立たせる用途。
   */
  featured?: boolean;
  /** 対象卒業年度 (例: 2027)。null は全学年対象。 */
  targetGraduationYear: number | null;
};

export type EventsHero = {
  /** 見出しの上に表示する小見出し。例: "EXCLUSIVE ACCESS" */
  eyebrow: string;
  /** "\n" で改行可。 */
  title: string;
  imageUrl: string;
};

export type EventsData = {
  hero: EventsHero;
  events: EventItem[];
};

export type EventSpeaker = {
  id: string;
  name: string;
  /** 肩書き。例: "グローバル戦略ディレクター" */
  role: string;
  /** 一行バイオ。 */
  bio: string;
  imageUrl: string;
};

export type EventScheduleItem = {
  id: string;
  /** "10:00 - 11:30" 形式。 */
  timeRange: string;
  title: string;
  /** サブ見出し（任意）。 */
  caption?: string;
  /** 現在 / 開始前のステップの強調表示。 */
  emphasized?: boolean;
};

export type EventAccess = {
  /** 例: "東京都千代田区内幸町 1-1-1" */
  address: string;
  /** 例: "帝国ホテル 本館 2F ダイヤモンドルーム" */
  venue: string;
  /** Google Maps iframe の src。`maps.google.com/maps?...&output=embed` 形式。 */
  mapEmbedUrl: string;
};

export type EventDetail = {
  id: string;
  title: string;
  dateLabel: string;
  locationLabel: string;
  heroImageUrl: string;
  /** ヒーローに出すバッジラベル。例: "特別招待枠" */
  heroEyebrow: string;
  /** 開催概要の段落（1段落 1要素）。 */
  description: string[];
  speakers: EventSpeaker[];
  schedule: EventScheduleItem[];
  access: EventAccess | null;
  capacity: number | null;
  remainingCapacity: number | null;
  applicationDeadline: string | null;
  targetGraduationYear: number | null;
  /** 対象職種。空配列は「全職種対象」。 */
  jobTypes: JobTypeKey[];
  /** 開催形式 (online / offline / hybrid)。 */
  format: EventLocationKind;
  /** オンライン参加 URL。online / hybrid のときだけ意味を持つ。 */
  onlineUrl: string | null;
  /** JST 整形済の開催日時レンジ（例 "2026.05.20 (水) 19:00 〜 20:30"）。 */
  dateTimeRangeLabel: string;
  /** JST 整形済の申込締切（時刻まで、例 "2026.05.15 23:59"）。null は期限なし。 */
  applicationDeadlineDateTimeLabel: string | null;
};

type AvailabilityInput = Pick<
  EventItem,
  "capacity" | "remainingCapacity" | "applicationDeadline"
>;

/**
 * 定員・申込期限から受付状態を計算する。
 * - 締切過ぎ → closed
 * - 残席 0 → full
 * - 残席 ≤ 20% → nearly_full
 * - それ以外 → open
 * closed と full のときは isBlocked=true となり UI で申込不可にする。
 */
export function deriveAvailability(
  input: AvailabilityInput,
  now: Date = new Date(),
): EventAvailability {
  const deadlineLabel = input.applicationDeadline
    ? formatDeadlineLabel(input.applicationDeadline)
    : null;

  if (input.applicationDeadline) {
    // 締切日の終日 (JST 23:59:59) までを受付とみなす。
    const deadline = new Date(`${input.applicationDeadline}T23:59:59+09:00`);
    if (!Number.isNaN(deadline.getTime()) && now > deadline) {
      return {
        status: "closed",
        remainingCapacity: input.remainingCapacity,
        capacity: input.capacity,
        deadlineLabel,
        isBlocked: true,
      };
    }
  }

  if (input.remainingCapacity !== null && input.capacity !== null) {
    if (input.remainingCapacity <= 0) {
      return {
        status: "full",
        remainingCapacity: 0,
        capacity: input.capacity,
        deadlineLabel,
        isBlocked: true,
      };
    }
    if (input.remainingCapacity / input.capacity <= 0.2) {
      return {
        status: "nearly_full",
        remainingCapacity: input.remainingCapacity,
        capacity: input.capacity,
        deadlineLabel,
        isBlocked: false,
      };
    }
  }

  return {
    status: "open",
    remainingCapacity: input.remainingCapacity,
    capacity: input.capacity,
    deadlineLabel,
    isBlocked: false,
  };
}

function formatDeadlineLabel(iso: string): string {
  // "YYYY-MM-DD" → "YYYY.MM.DD"
  return iso.replace(/-/g, ".");
}
