import { z } from "zod";

/**
 * メールアドレス
 */
export const emailSchema = z.string().email("有効なメールアドレスを入力してください");

/**
 * パスワード（12文字以上 — セキュリティ要件書 1.1 準拠）
 */
export const passwordSchema = z
  .string()
  .min(12, "パスワードは12文字以上で入力してください");

/**
 * URL
 */
export const urlSchema = z.string().url("有効なURLを入力してください");
