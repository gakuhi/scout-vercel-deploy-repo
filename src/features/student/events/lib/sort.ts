import type { EventItem } from "../schema";

export const SORT_KEYS = ["date_asc", "date_desc", "deadline_asc"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  date_asc: "開催日が近い順",
  date_desc: "開催日が遠い順",
  deadline_asc: "締切が近い順",
};

/**
 * dateLabel "YYYY.MM.DD" or "YYYY.MM.DD - MM.DD" の先頭 10 文字を Date に変換。
 * 失敗時は null を返す（不正データを比較から除外できるよう）。
 */
export function parseEventDate(dateLabel: string): Date | null {
  const head = dateLabel.slice(0, 10).replace(/\./g, "-");
  const d = new Date(`${head}T00:00:00+09:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * 2 つのイベントを sortKey で比較。
 * - featured フラグが立っているものは常に最上段（プライマリキー）。
 * - 不正な日付 / null deadline は末尾に倒す。
 * - date_asc: 開催日が早い順、date_desc: 開催日が遅い順、deadline_asc: 締切が近い順。
 */
export function compareEvents(
  a: EventItem,
  b: EventItem,
  sortKey: SortKey,
): number {
  // featured 同士は同列として扱い、ユーザー選択のソートキーで二次ソート。
  const aFeatured = a.featured ? 1 : 0;
  const bFeatured = b.featured ? 1 : 0;
  if (aFeatured !== bFeatured) return bFeatured - aFeatured;
  if (sortKey === "deadline_asc") {
    const ad = a.applicationDeadline;
    const bd = b.applicationDeadline;
    if (!ad && !bd) return 0;
    if (!ad) return 1; // 締切なしは末尾
    if (!bd) return -1;
    return ad.localeCompare(bd);
  }
  const ad = parseEventDate(a.dateLabel);
  const bd = parseEventDate(b.dateLabel);
  if (!ad && !bd) return 0;
  if (!ad) return 1;
  if (!bd) return -1;
  const diff = ad.getTime() - bd.getTime();
  return sortKey === "date_desc" ? -diff : diff;
}
