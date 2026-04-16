import { z } from "zod";

/**
 * 有効なプロダクト識別子
 */
export const productSourceSchema = z.enum([
  "smartes",
  "interviewai",
  "compai",
  "sugoshu",
]);

export type ProductSource = z.infer<typeof productSourceSchema>;

/**
 * callback URL のホワイトリスト
 * 各プロダクトのドメインを登録する
 */
const ALLOWED_CALLBACK_ORIGINS = [
  process.env.ALLOWED_CALLBACK_SMARTES,
  process.env.ALLOWED_CALLBACK_INTERVIEWAI,
  process.env.ALLOWED_CALLBACK_COMPAI,
  process.env.ALLOWED_CALLBACK_SUGOSHU,
].filter(Boolean) as string[];

/**
 * 外部プロダクトからの同時登録リクエストのクエリパラメータ
 *
 * source がある場合のみ使用（直接ログインでは不要）
 */
export const registerQuerySchema = z.object({
  source: productSourceSchema,
  source_user_id: z.string().min(1, "source_user_id is required"),
  callback_url: z
    .string()
    .url("callback_url must be a valid URL")
    .refine(
      (url) => {
        const origin = new URL(url).origin;
        return ALLOWED_CALLBACK_ORIGINS.includes(origin);
      },
      { message: "callback_url is not in the allowlist" },
    ),
  signature: z.string().min(1, "signature is required"),
});

export type RegisterQuery = z.infer<typeof registerQuerySchema>;
