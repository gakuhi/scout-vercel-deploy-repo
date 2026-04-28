/**
 * イベント日時の JST 固定フォーマッタ群。
 *
 * `events.starts_at` / `ends_at` / `application_deadline` は TIMESTAMPTZ で
 * 保存されている。Vercel ランタイムは UTC のため、`Date#getFullYear()` 等を
 * 使うとサーバ TZ に引っ張られる。本ファイルでは `Intl.DateTimeFormat` の
 * `timeZone: "Asia/Tokyo"` 指定で常に JST 表示にする。
 */

type Part = "year" | "month" | "day" | "weekday" | "hour" | "minute";

const JST_PARTS_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function getJstParts(date: Date): Record<Part, string> {
  const parts = JST_PARTS_FORMATTER.formatToParts(date);
  const map: Partial<Record<Part, string>> = {};
  for (const p of parts) {
    if (p.type === "year") map.year = p.value;
    if (p.type === "month") map.month = p.value;
    if (p.type === "day") map.day = p.value;
    if (p.type === "weekday") map.weekday = p.value;
    if (p.type === "hour") map.hour = p.value;
    if (p.type === "minute") map.minute = p.value;
  }
  return map as Record<Part, string>;
}

function isValid(iso: string): boolean {
  return !Number.isNaN(new Date(iso).getTime());
}

/** JST の "YYYY.MM.DD" 形式。一覧の `dateLabel` で使用。 */
export function formatDateJst(iso: string): string {
  if (!isValid(iso)) return iso;
  const p = getJstParts(new Date(iso));
  return `${p.year}.${p.month}.${p.day}`;
}

/** JST の "YYYY.MM.DD HH:MM" 形式。申込締切の表示などで使用。 */
export function formatDateTimeJst(iso: string): string {
  if (!isValid(iso)) return iso;
  const p = getJstParts(new Date(iso));
  return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`;
}

/**
 * 開始〜終了の JST レンジ表示。
 * - 同日: "2026.05.20 (水) 19:00 〜 20:30"
 * - 日跨ぎ: "2026.08.04 (火) 10:00 〜 2026.08.15 (土) 18:00"
 * - 終了未定: "2026.05.20 (水) 19:00 〜"
 *
 * 「同日」判定は **JST のカレンダー日付** で比較する（UTC 基準ではない）。
 */
export function formatDateTimeRangeJst(
  startIso: string,
  endIso: string | null,
): string {
  if (!isValid(startIso)) return startIso;
  const start = getJstParts(new Date(startIso));
  const startStr = `${start.year}.${start.month}.${start.day} (${start.weekday}) ${start.hour}:${start.minute}`;

  if (!endIso || !isValid(endIso)) return `${startStr} 〜`;

  const end = getJstParts(new Date(endIso));
  const sameDay =
    start.year === end.year &&
    start.month === end.month &&
    start.day === end.day;

  if (sameDay) {
    return `${startStr} 〜 ${end.hour}:${end.minute}`;
  }
  const endStr = `${end.year}.${end.month}.${end.day} (${end.weekday}) ${end.hour}:${end.minute}`;
  return `${startStr} 〜 ${endStr}`;
}
