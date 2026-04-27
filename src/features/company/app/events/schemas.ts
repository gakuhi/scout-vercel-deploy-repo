import { z } from "zod";

const emptyToNull = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? null : val),
  z.string().nullable(),
);

export const EVENT_FORMATS = ["online", "offline", "hybrid"] as const;
export type EventFormat = (typeof EVENT_FORMATS)[number];

export const EVENT_FORMAT_LABELS: Record<EventFormat, string> = {
  online: "オンライン",
  offline: "対面",
  hybrid: "ハイブリッド",
};

export const EVENT_TYPES = [
  "会社説明会",
  "合同企業説明会",
  "インターンシップ",
  "セミナー",
  "その他",
] as const;

const isValidDatetime = (val: string) => !Number.isNaN(Date.parse(val));

export const eventSchema = z.object({
  title: z.string().trim().min(1, "イベント名を入力してください").max(200),
  eventType: emptyToNull.refine(
    (val) => val === null || (EVENT_TYPES as readonly string[]).includes(val),
    "有効なカテゴリを選択してください",
  ),
  format: z.enum(EVENT_FORMATS, "開催形式を選択してください"),
  startsAt: z
    .string()
    .min(1, "開始日時を入力してください")
    .refine(isValidDatetime, "有効な日時を入力してください"),
  endsAt: emptyToNull.refine(
    (val) => val === null || isValidDatetime(val),
    "有効な日時を入力してください",
  ),
  location: emptyToNull,
  onlineUrl: emptyToNull.refine(
    (val) => {
      if (val === null) return true;
      try {
        const url = new URL(val);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    },
    "有効なURL（https:// または http://）を入力してください",
  ),
  description: emptyToNull.refine(
    (val) => val === null || val.length <= 5000,
    "イベント詳細は5000文字以内で入力してください",
  ),
  capacity: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return null;
      const num = Number(val);
      return Number.isNaN(num) ? null : num;
    },
    z.number().int().min(1, "1以上の数値を入力してください").nullable(),
  ),
  applicationDeadline: emptyToNull.refine(
    (val) => val === null || isValidDatetime(val),
    "有効な日付を入力してください",
  ),
  targetGraduationYear: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return null;
      const num = Number(val);
      return Number.isNaN(num) ? null : num;
    },
    z.number().int().min(2020).max(2040).nullable(),
  ),
}).refine(
  (data) => {
    if (!data.endsAt) return true;
    return new Date(data.endsAt) > new Date(data.startsAt);
  },
  { message: "終了日時は開始日時より後にしてください", path: ["endsAt"] },
);

export type EventInput = z.infer<typeof eventSchema>;
