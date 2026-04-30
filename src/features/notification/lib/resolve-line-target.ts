import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/shared/types/database";

import type { NotificationRecipientRole } from "./types";

type AdminClient = SupabaseClient<Database>;

/**
 * 指定ユーザーの LINE user_id を解決する。
 *
 * 学生 (`role === "student"`):
 *   - `line_friendships` を参照し、`student_id = userId AND is_friend = true`
 *     を満たす行から `line_uid` を返す
 *   - LINE Messaging API の push は「bot と友だち関係にあるユーザー」にしか
 *     届かないため、認証の事実 (`auth.identities`) ではなく友だち状態を保持する
 *     `line_friendships` を見るのが本筋
 *   - 行が無い、または `is_friend = false` の場合は null を返して LINE 送信を
 *     スキップ（fail-open）。設計書 docs/development/07-simultaneous-registration-design.md 参照
 *
 * 企業担当者 (`role === "company_member"`):
 *   - 企業担当者は LINE 通知の対象外（メール通知方針）。常に null を返す。
 *
 * 注意: 学生分岐は Service Role が必要。必ず createAdminClient() 経由で
 *      取得したクライアントを渡すこと。
 */
export async function resolveLineTarget(
  admin: AdminClient,
  userId: string,
  role: NotificationRecipientRole,
): Promise<string | null> {
  if (role !== "student") return null;
  return resolveLineTargetForStudent(admin, userId);
}

async function resolveLineTargetForStudent(
  admin: AdminClient,
  studentId: string,
): Promise<string | null> {
  // line_friendships は migration 20260416 で追加されたが、生成済みの
  // Database 型にはまだ含まれていないため、汎用 SupabaseClient へ
  // キャストして問い合わせる。
  const { data, error } = await (admin as unknown as SupabaseClient)
    .from("line_friendships")
    .select("line_uid")
    .eq("student_id", studentId)
    .eq("is_friend", true)
    .maybeSingle();

  if (error) {
    throw new Error(`line_friendships の取得に失敗: ${error.message}`);
  }

  const row = data as { line_uid: string | null } | null;
  const lineUid = row?.line_uid;
  if (typeof lineUid !== "string" || lineUid.length === 0) return null;

  return lineUid;
}
