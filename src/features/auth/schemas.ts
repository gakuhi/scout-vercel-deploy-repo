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
 *
 * 各プロダクトのドメインに加え、scout 自身（`NEXT_PUBLIC_BASE_URL`）も許可する。
 * scout 自身を指定するケースは「既存プロダクト学生がスカウト本体に着地して
 * 使い始める」導線で使われ、callback ハンドラ側でセッションも確立する（issue #253）。
 */
const ALLOWED_CALLBACK_ORIGINS = [
  process.env.ALLOWED_CALLBACK_SMARTES,
  process.env.ALLOWED_CALLBACK_INTERVIEWAI,
  process.env.ALLOWED_CALLBACK_COMPAI,
  process.env.ALLOWED_CALLBACK_SUGOSHU,
  process.env.NEXT_PUBLIC_BASE_URL,
].filter(Boolean) as string[];

/**
 * 外部プロダクトからの同時登録リクエストのパラメータ
 *
 * POST /api/student/auth/line の form body として受け取る。
 * 直接ログイン（GET, source なし）では使わない。
 */
export const registerParamsSchema = z.object({
  source: productSourceSchema,
  source_user_id: z.string().min(1, "source_user_id is required"),
  // email は optional（プロダクト側でユーザーの email を保持していないケースを許容）。
  // 値が入る場合は email 形式を必須、空文字 or 未指定はいずれも「無し」として扱う。
  // HMAC 署名対象では空文字として連結する契約（docs/development/08-product-side-tasks.md）。
  email: z
    .string()
    .email("email must be a valid email address when provided")
    .or(z.literal(""))
    .optional(),
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

export type RegisterParams = z.infer<typeof registerParamsSchema>;
