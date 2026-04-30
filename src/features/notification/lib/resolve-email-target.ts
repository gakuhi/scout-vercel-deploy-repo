import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/shared/types/database";

import type { NotificationRecipientRole } from "./types";

type AdminClient = SupabaseClient<Database>;

/**
 * 指定ユーザーへ通知メールを送る宛先メールアドレスを解決する。
 *
 * 学生 (`role === "student"`):
 *   - 学生はメール通知の対象外（LINE 専用方針）。常に null を返してメール送信をスキップ。
 *
 * 企業担当者 (`role === "company_member"`):
 *   - `company_members.email` を `id = userId` で引く
 *   - 行が存在しない / email が空の場合は null を返してメール送信をスキップ（fail-open）
 *
 * 注意: `company_members` の SELECT は Service Role（RLS バイパス）が必要。
 *      必ず createAdminClient() 経由で取得したクライアントを渡すこと。
 */
export async function resolveEmailTarget(
  admin: AdminClient,
  userId: string,
  role: NotificationRecipientRole,
): Promise<string | null> {
  if (role !== "company_member") return null;

  const { data, error } = await admin
    .from("company_members")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`company_members の取得に失敗: ${error.message}`);
  }

  const email = data?.email;
  if (typeof email !== "string" || email.length === 0) return null;
  return email;
}
