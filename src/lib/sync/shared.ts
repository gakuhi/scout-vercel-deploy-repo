import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/shared/types/database";

export type ProductSource = Database["public"]["Enums"]["product_source"];

/**
 * 1 ユーザーを対象に同期した時の結果。
 * テーブルごとに UPSERT した件数とエラーメッセージを集約する。
 * 部分成功（あるテーブルは書けたが別テーブルは失敗）も表現できるようにしてある。
 */
export type SyncUserResult = {
  product: ProductSource;
  externalUserId: string;
  ok: boolean;
  upserted: Record<string, number>;
  errors: string[];
};

/**
 * 同意済み全ユーザーを対象に同期した時の結果。
 * 内部的には `syncUser` をユーザー分ループして集約する想定。
 */
export type SyncAllResult = {
  product: ProductSource;
  usersProcessed: number;
  usersSucceeded: number;
  usersFailed: number;
  upsertedTotal: Record<string, number>;
  errors: string[];
};

/**
 * 指定プロダクトで、データ連携に同意済みの学生の external_user_id 一覧を返す。
 * - 同意は `students.data_consent_granted_at IS NOT NULL` で判定（06-00 6節）
 * - 連携リンクは `student_product_links` から取得
 */
export async function getConsentedExternalUserIds(
  product: ProductSource,
): Promise<string[]> {
  const supabase = createAdminClient();

  // students と student_product_links を二段 SELECT で取得
  // （join を inner select で書くと PostgREST の仕様が面倒なので単純に二段にする）
  const { data: consentedStudents, error: studentErr } = await supabase
    .from("students")
    .select("id")
    .not("data_consent_granted_at", "is", null);

  if (studentErr) {
    throw new Error(
      `[sync/${product}] 同意済み学生の取得に失敗: ${studentErr.message}`,
    );
  }

  if (!consentedStudents || consentedStudents.length === 0) return [];

  const studentIds = consentedStudents.map((s) => s.id);

  const { data: links, error: linkErr } = await supabase
    .from("student_product_links")
    .select("external_user_id")
    .eq("product", product)
    .in("student_id", studentIds);

  if (linkErr) {
    throw new Error(
      `[sync/${product}] product_links の取得に失敗: ${linkErr.message}`,
    );
  }

  return (links ?? []).map((l) => l.external_user_id);
}

/**
 * Cron からの呼び出しを CRON_SECRET で認証する。
 * 認証 OK なら true、失敗なら false を返すだけのシンプル実装。
 */
export function isValidCronRequest(headers: Headers): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = headers.get("authorization");
  return auth === `Bearer ${secret}`;
}
