import {
  EVENT_CATEGORIES,
  type EventBadge,
  type EventCategoryKey,
  type EventDetail,
  type EventItem,
  type EventLocationKind,
} from "../schema";
import {
  formatDateJst,
  formatDateTimeJst,
  formatDateTimeRangeJst,
} from "./datetime";

/**
 * events テーブル 1 行 + 申込件数から UI の EventItem を組み立てる。
 * Database 型が未生成なので、まずは必要カラムだけを受け取るシグネチャにしている。
 */
export type DbEventRow = {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  format: "online" | "offline" | "hybrid";
  location: string | null;
  online_url: string | null;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  application_deadline: string | null;
  target_graduation_year: number | null;
};

const CATEGORY_KEYS: readonly EventCategoryKey[] = EVENT_CATEGORIES;

function isCategoryKey(value: string | null): value is EventCategoryKey {
  return value !== null && (CATEGORY_KEYS as readonly string[]).includes(value);
}

/** DB の format → UI 側 locationKind は 1:1。 */
function mapFormatToLocationKind(
  format: DbEventRow["format"],
): EventLocationKind {
  return format;
}

/** DB の format をバッジ色として使う（"exclusive" バッジは DB にまだ概念がないため未使用）。 */
function mapFormatToBadge(format: DbEventRow["format"]): EventBadge {
  return format;
}

/** application_deadline (TIMESTAMPTZ) → JST の "YYYY-MM-DD" */
function formatDeadlineIso(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  // formatDateJst は "YYYY.MM.DD" を返すので、後段の deriveAvailability が
  // 解釈できる "YYYY-MM-DD" 形式に揃える。
  return formatDateJst(iso).replace(/\./g, "-");
}

function resolveLocationLabel(row: DbEventRow): string {
  if (row.location && row.location.trim().length > 0) return row.location;
  if (row.format === "online") return "オンライン開催";
  return "開催情報調整中";
}

/** events テーブルの行から UI の EventItem を生成。画像は未登録のため placeholder を使う。 */
export function mapDbEventToEventItem(
  row: DbEventRow,
  options?: { imageUrl?: string },
): EventItem {
  return {
    id: row.id,
    title: row.title,
    dateLabel: formatDateJst(row.starts_at),
    locationLabel: resolveLocationLabel(row),
    locationKind: mapFormatToLocationKind(row.format),
    badge: mapFormatToBadge(row.format),
    imageUrl: options?.imageUrl ?? DEFAULT_EVENT_IMAGE_URL,
    category: isCategoryKey(row.event_type) ? row.event_type : "その他",
    // job_types カラムは DB 未実装のため空配列。今は mock で確認、将来 DB に追加。
    jobTypes: [],
    capacity: row.capacity,
    remainingCapacity: row.capacity, // 申込件数との差分計算は呼び出し側で上書きする
    applicationDeadline: formatDeadlineIso(row.application_deadline),
    targetGraduationYear: row.target_graduation_year,
  };
}

/**
 * 残席数を反映した EventItem を返すヘルパ。
 * `appliedCounts` は event_id → 申込件数 (status='applied') のマップ。
 */
export function applyRemainingCapacity(
  item: EventItem,
  appliedCounts: Map<string, number>,
): EventItem {
  if (item.capacity === null) return item;
  const applied = appliedCounts.get(item.id) ?? 0;
  return {
    ...item,
    remainingCapacity: Math.max(0, item.capacity - applied),
  };
}

/** 詳細ビュー用。speakers / schedule / access は DB に無いため空で返す。 */
export function mapDbEventToEventDetail(
  row: DbEventRow,
  options?: {
    imageUrl?: string;
    appliedCount?: number;
  },
): EventDetail {
  const baseItem = mapDbEventToEventItem(row, options);
  const remaining =
    row.capacity !== null
      ? Math.max(0, row.capacity - (options?.appliedCount ?? 0))
      : null;
  return {
    id: row.id,
    title: row.title,
    dateLabel: formatDateJst(row.starts_at),
    locationLabel: resolveLocationLabel(row),
    heroImageUrl: options?.imageUrl ?? DEFAULT_EVENT_HERO_IMAGE_URL,
    heroEyebrow:
      row.event_type && isCategoryKey(row.event_type) ? CATEGORY_EYEBROW[row.event_type] : "イベント",
    description: row.description ? row.description.split(/\n\n+/) : [],
    speakers: [],
    schedule: [],
    access: null,
    capacity: baseItem.capacity,
    remainingCapacity: remaining,
    applicationDeadline: baseItem.applicationDeadline,
    targetGraduationYear: baseItem.targetGraduationYear,
    jobTypes: baseItem.jobTypes,
    format: row.format,
    onlineUrl: row.online_url,
    dateTimeRangeLabel: formatDateTimeRangeJst(row.starts_at, row.ends_at),
    applicationDeadlineDateTimeLabel: row.application_deadline
      ? formatDateTimeJst(row.application_deadline)
      : null,
  };
}

// カテゴリ自体が表示文字列なので、heroEyebrow は基本的に key をそのまま流用する。
// 「その他」だけは具体性に欠けるので汎用的な「イベント」で上書き。
const CATEGORY_EYEBROW: Record<EventCategoryKey, string> = {
  会社説明会: "会社説明会",
  合同企業説明会: "合同企業説明会",
  インターンシップ: "インターンシップ",
  セミナー: "セミナー",
  その他: "イベント",
};

/** DB に画像カラムが無いため、暫定の単一プレースホルダ画像を使う。public/ 配下の SVG。 */
export const DEFAULT_EVENT_IMAGE_URL = "/images/event-placeholder.svg";

export const DEFAULT_EVENT_HERO_IMAGE_URL = "/images/event-hero-placeholder.svg";
