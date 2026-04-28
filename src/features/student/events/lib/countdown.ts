import type { EventItem } from "../schema";
import { parseEventDate } from "./sort";

export type EventCountdown = {
  /** "deadline" は締切ベース、"event" は開催日ベース。 */
  kind: "deadline" | "event";
  /** 0 = 当日、>0 = 残り日数。 */
  days: number;
  /** 残り 3 日以内なら true。UI で警告色に切り替える用。 */
  urgent: boolean;
  /** 表示用ラベル（"本日締切" / "締切まで 2 日" / "開催まで 5 日" 等）。 */
  label: string;
};

/**
 * 「年月日」レベルでの差分日数（時刻は無視）。本プロダクトは ja-JP 想定なので
 * JST (UTC+09:00) を基準にした「日」で計算する。getFullYear 等は実行環境の TZ に
 * 依存するため使わず、UTC ミリ秒に JST オフセットを足してから 1 日で割って
 * "JST epoch day" を求めて差分を取る（CI = UTC でも開発機 = JST でも同じ結果）。
 */
function dayDiff(target: Date, now: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  const jstOffsetMs = 9 * 60 * 60 * 1000;
  const t = Math.floor((target.getTime() + jstOffsetMs) / oneDay);
  const n = Math.floor((now.getTime() + jstOffsetMs) / oneDay);
  return t - n;
}

/**
 * イベントカードに出すカウントダウンを計算する。
 *
 * - 開催日が過去 → null（バッジを出さない）
 * - 申込締切が未来 → 締切ベースで表示（締切が先に来るので urgent 度が高い）
 * - それ以外 → 開催日ベース
 *
 * 当日は "本日開催" / "本日締切"、それ以外は "開催まで N 日" / "締切まで N 日"。
 */
export function getCountdown(
  event: EventItem,
  now: Date = new Date(),
): EventCountdown | null {
  const eventDate = parseEventDate(event.dateLabel);
  if (!eventDate) return null;

  const eventDays = dayDiff(eventDate, now);
  if (eventDays < 0) return null; // 開催が過去 → バッジ非表示

  // 締切が今日以降ならそちらを優先表示。
  if (event.applicationDeadline) {
    const deadline = parseEventDate(
      event.applicationDeadline.replace(/-/g, "."),
    );
    if (deadline) {
      const days = dayDiff(deadline, now);
      if (days >= 0) {
        return {
          kind: "deadline",
          days,
          urgent: days <= 3,
          label: days === 0 ? "本日締切" : `締切まで ${days} 日`,
        };
      }
      // 締切過ぎてるが開催はこれから（変則ケース）→ 開催日ベースに倒す
    }
  }

  return {
    kind: "event",
    days: eventDays,
    urgent: eventDays <= 3,
    label: eventDays === 0 ? "本日開催" : `開催まで ${eventDays} 日`,
  };
}
