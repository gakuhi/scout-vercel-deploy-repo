import postgres from "postgres";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getConsentedExternalUserIds,
  type SyncAllResult,
  type SyncUserResult,
} from "./shared";

/**
 * 企業分析AI（Supabase Transaction Pooler, scout_reader ロール）からの同期。
 *
 * 元テーブル:
 *   - profiles                               → synced_compai_users（created_at を保持）
 *   - researches                             → synced_compai_researches
 *   - research_messages JOIN researches      → synced_compai_messages
 *
 * フィルタ:
 *   - researches.deleted_at IS NOT NULL のレコードは ETL 側で除外
 *     （論理削除済み。研究紐付きの research_messages も INNER JOIN で連動除外）
 *   - 削除済みレコードが既に synced_* に残っている場合の扱いは Phase B MVP では
 *     無視する（運用で問題になったら別途対応）
 *
 * 取得しないフィールド:
 *   - researches.citations（URL 単体の JSON 文字列で価値低、カラム自体は残す）
 *   - researches.perplexity_id, model, tokens_used, plan_tier（システム内部）
 *   - research_messages.model, tokens_used, feedback
 */

const PRODUCT = "compai" as const;

function pgConnect() {
  const connectionString = process.env.COMPAI_DB_URL;
  if (!connectionString) {
    throw new Error("COMPAI_DB_URL が未設定");
  }
  return postgres(connectionString, {
    prepare: false,
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });
}

type ProfileRow = {
  user_id: string;
  created_at: Date | null;
};

type ResearchRow = {
  id: string;
  user_id: string;
  title: string | null;
  url: string | null;
  content: string | null;
  raw_content: string | null;
  is_bookmarked: boolean | null;
  status: string | null;
  original_created_at: Date | null;
};

type MessageRow = {
  id: string;
  research_id: string;
  user_id: string;
  content: string | null;
  sender_type: string | null;
  original_created_at: Date | null;
};

export async function syncUser(
  externalUserId: string,
): Promise<SyncUserResult> {
  const result: SyncUserResult = {
    product: PRODUCT,
    externalUserId,
    ok: true,
    upserted: {},
    errors: [],
  };

  const sql = pgConnect();
  const supabase = createAdminClient();

  try {
    const [profileRes, researchesRes, messagesRes] = await Promise.allSettled([
      sql<ProfileRow[]>`
        SELECT user_id, created_at
        FROM profiles
        WHERE user_id = ${externalUserId}
        LIMIT 1
      `,
      sql<ResearchRow[]>`
        SELECT
          id,
          user_id,
          title,
          url,
          content,
          raw_content,
          is_bookmarked,
          status,
          created_at AS original_created_at
        FROM researches
        WHERE user_id = ${externalUserId}
          AND deleted_at IS NULL
      `,
      sql<MessageRow[]>`
        SELECT
          rm.id,
          rm.research_id,
          r.user_id,
          rm.content,
          rm.sender_type,
          rm.created_at AS original_created_at
        FROM research_messages rm
        INNER JOIN researches r ON r.id = rm.research_id
        WHERE r.user_id = ${externalUserId}
          AND r.deleted_at IS NULL
      `,
    ]);

    // --- synced_compai_users ---
    if (profileRes.status === "fulfilled") {
      const profile = profileRes.value[0];
      const { error } = await supabase.from("synced_compai_users").upsert(
        {
          external_user_id: externalUserId,
          original_created_at: dateToIso(profile?.created_at ?? null),
          synced_at: new Date().toISOString(),
        },
        { onConflict: "external_user_id" },
      );
      if (error) {
        result.errors.push(`synced_compai_users upsert: ${error.message}`);
      } else {
        result.upserted.synced_compai_users = 1;
      }
    } else {
      result.errors.push(
        `profiles SELECT 失敗: ${errMsg(profileRes.reason)}`,
      );
    }

    // --- synced_compai_researches ---
    if (researchesRes.status === "fulfilled") {
      const rows = researchesRes.value;
      if (rows.length > 0) {
        const insertRows = rows.map((r) => ({
          external_user_id: externalUserId,
          external_research_id: r.id,
          title: r.title,
          url: r.url,
          content: r.content,
          raw_content: r.raw_content,
          is_bookmarked: r.is_bookmarked,
          status: r.status,
          original_created_at: dateToIso(r.original_created_at),
          synced_at: new Date().toISOString(),
        }));
        const { error } = await supabase
          .from("synced_compai_researches")
          .upsert(insertRows, { onConflict: "external_research_id" });
        if (error) {
          result.errors.push(
            `synced_compai_researches upsert: ${error.message}`,
          );
        } else {
          result.upserted.synced_compai_researches = insertRows.length;
        }
      }
    } else {
      result.errors.push(
        `researches SELECT 失敗: ${errMsg(researchesRes.reason)}`,
      );
    }

    // --- synced_compai_messages ---
    if (messagesRes.status === "fulfilled") {
      const rows = messagesRes.value;
      if (rows.length > 0) {
        const insertRows = rows.map((r) => ({
          external_user_id: externalUserId,
          external_message_id: r.id,
          external_research_id: r.research_id,
          content: r.content,
          sender_type: r.sender_type,
          original_created_at: dateToIso(r.original_created_at),
          synced_at: new Date().toISOString(),
        }));
        const { error } = await supabase
          .from("synced_compai_messages")
          .upsert(insertRows, { onConflict: "external_message_id" });
        if (error) {
          result.errors.push(
            `synced_compai_messages upsert: ${error.message}`,
          );
        } else {
          result.upserted.synced_compai_messages = insertRows.length;
        }
      }
    } else {
      result.errors.push(
        `research_messages SELECT 失敗: ${errMsg(messagesRes.reason)}`,
      );
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  result.ok = result.errors.length === 0;
  return result;
}

export async function syncAllConsented(): Promise<SyncAllResult> {
  const result: SyncAllResult = {
    product: PRODUCT,
    usersProcessed: 0,
    usersSucceeded: 0,
    usersFailed: 0,
    upsertedTotal: {},
    errors: [],
  };

  let externalIds: string[];
  try {
    externalIds = await getConsentedExternalUserIds(PRODUCT);
  } catch (err) {
    result.errors.push(errMsg(err));
    return result;
  }

  for (const externalId of externalIds) {
    result.usersProcessed += 1;
    const userResult = await syncUser(externalId);
    if (userResult.ok) {
      result.usersSucceeded += 1;
    } else {
      result.usersFailed += 1;
      result.errors.push(`${externalId}: ${userResult.errors.join(" / ")}`);
    }
    for (const [table, count] of Object.entries(userResult.upserted)) {
      result.upsertedTotal[table] = (result.upsertedTotal[table] ?? 0) + count;
    }
  }

  return result;
}

export function dateToIso(v: Date | null): string | null {
  return v instanceof Date ? v.toISOString() : null;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
