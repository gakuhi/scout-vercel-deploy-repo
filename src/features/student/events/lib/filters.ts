import type {
  EventFilterKey,
  EventItem,
  JobTypeKey,
} from "../schema";

/**
 * フィルタタブの判定。
 * "all": 常に true
 * "applied": isApplied 判定に委譲
 * "online" / "offline" / "hybrid": locationKind と一致
 * それ以外（カテゴリキー）: event.category と一致
 */
export function matchesFilter(
  event: EventItem,
  filter: EventFilterKey,
  isApplied: (id: string) => boolean,
): boolean {
  if (filter === "all") return true;
  if (filter === "applied") return isApplied(event.id);
  if (filter === "online") return event.locationKind === "online";
  if (filter === "offline") return event.locationKind === "offline";
  if (filter === "hybrid") return event.locationKind === "hybrid";
  return event.category === filter;
}

/** 卒業年度フィルタ。対象年度 null のイベントは「全学年対象」なので常に通す。 */
export function matchesYear(
  event: EventItem,
  selectedYear: number | null,
): boolean {
  if (selectedYear === null) return true;
  if (event.targetGraduationYear === null) return true;
  return event.targetGraduationYear === selectedYear;
}

/**
 * 開催月フィルタ。selectedMonth は "YYYY-MM" 形式 (例 "2026-05")。
 * EventItem.dateLabel は "YYYY.MM.DD" or "YYYY.MM.DD - MM.DD" 形式なので、
 * 先頭 7 文字 "YYYY.MM" を抽出して比較する。
 */
export function matchesMonth(
  event: EventItem,
  selectedMonth: string | null,
): boolean {
  if (!selectedMonth) return true;
  const head = event.dateLabel.slice(0, 7).replace(".", "-");
  return head === selectedMonth;
}

/**
 * 職種フィルタ。jobTypes が空のイベントは「全職種対象」なので常に通す。
 * 選択中の職種をイベントの jobTypes が含んでいればヒット。
 */
export function matchesJobType(
  event: EventItem,
  selected: JobTypeKey | null,
): boolean {
  if (!selected) return true;
  if (event.jobTypes.length === 0) return true;
  return event.jobTypes.includes(selected);
}

/**
 * キーワード検索。title / locationLabel / category を対象に部分一致 (case-insensitive)。
 * 空文字や空白のみのクエリは全件通す。
 */
export function matchesSearch(event: EventItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  return (
    event.title.toLowerCase().includes(q) ||
    event.locationLabel.toLowerCase().includes(q) ||
    event.category.toLowerCase().includes(q)
  );
}
