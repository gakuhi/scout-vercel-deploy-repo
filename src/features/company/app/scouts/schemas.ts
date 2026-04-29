import { z } from "zod";

export const scoutMessageSchema = z.object({
  subject: z.string().trim().min(1, "件名を入力してください").max(200),
  message: z
    .string()
    .trim()
    .min(1, "本文を入力してください")
    .max(5000, "本文は5000文字以内で入力してください"),
  jobPostingId: z.string().min(1, "紐付ける求人を選択してください"),
  studentIds: z
    .array(z.string())
    .min(1, "送信先の学生を1人以上選択してください")
    .max(50, "一度に送信できるのは50人までです"),
});

export type ScoutMessageInput = z.infer<typeof scoutMessageSchema>;

export const MONTHLY_SCOUT_LIMIT = 30;
