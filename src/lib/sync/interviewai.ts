import postgres from "postgres";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getConsentedExternalUserIds,
  type SyncAllResult,
  type SyncUserResult,
} from "./shared";

/**
 * 面接練習AI（Supabase Transaction Pooler, scout_reader ロール）からの同期。
 *
 * 元テーブル:
 *   - interview_sessions JOIN companies      → synced_interviewai_sessions
 *   - user_company_searches JOIN companies   → synced_interviewai_searches
 *   - (user 情報は auth.users にしかアクセス不可。synced_interviewai_users は
 *     同期マーカーのみの役割で original_created_at も NULL で OK。
 *     email は state 経由で students.email に入るので NULL のまま。)
 *
 * JSONB 参照:
 *   - interview_sessions.interview_type->>'type' / 'industry' / 'phase'
 *   - interview_sessions.evaluation_data->>'overallScore' / 'growthHint' 等
 *   詳細は 06-00 4.1 の表を参照。
 */

const PRODUCT = "interviewai" as const;

function pgConnect() {
  const connectionString = process.env.INTERVIEWAI_DB_URL;
  if (!connectionString) {
    throw new Error("INTERVIEWAI_DB_URL が未設定");
  }
  return postgres(connectionString, {
    prepare: false,
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });
}

type SessionRow = {
  id: string;
  user_id: string;
  company_name: string | null;
  session_type: string | null;
  industry: string | null;
  phase: string | null;
  overall_score: number | null;
  skill_scores: unknown;
  strengths: unknown;
  areas_for_improvement: unknown;
  growth_hint: string | null;
  conversation_text: unknown;
  started_at: Date | null;
  original_created_at: Date | null;
  status: string | null;
};

type SearchRow = {
  id: string;
  user_id: string;
  company_name: string | null;
  searched_at: Date | null;
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
    const [sessionsRes, searchesRes] = await Promise.allSettled([
      sql<SessionRow[]>`
        SELECT
          s.id,
          s.user_id,
          c.name                                            AS company_name,
          s.interview_type->>'type'                         AS session_type,
          s.interview_type->>'industry'                     AS industry,
          s.interview_type->>'phase'                        AS phase,
          s.status                                          AS status,
          (s.evaluation_data->>'overallScore')::int         AS overall_score,
          s.evaluation_data->'categories'                   AS skill_scores,
          s.evaluation_data->'strengths'                    AS strengths,
          s.evaluation_data->'areasForImprovement'          AS areas_for_improvement,
          s.evaluation_data->>'growthHint'                  AS growth_hint,
          s.conversation_text                               AS conversation_text,
          s.started_at                                      AS started_at,
          s.created_at                                      AS original_created_at
        FROM interview_sessions s
        LEFT JOIN companies c ON c.id = s.company_id
        WHERE s.user_id = ${externalUserId}
      `,
      sql<SearchRow[]>`
        SELECT
          ucs.id,
          ucs.user_id,
          c.name            AS company_name,
          ucs.searched_at   AS searched_at
        FROM user_company_searches ucs
        LEFT JOIN companies c ON c.id = ucs.company_id
        WHERE ucs.user_id = ${externalUserId}
      `,
    ]);

    // --- synced_interviewai_users（マーカーのみ）---
    {
      const { error } = await supabase.from("synced_interviewai_users").upsert(
        {
          external_user_id: externalUserId,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "external_user_id" },
      );
      if (error) {
        result.errors.push(`synced_interviewai_users upsert: ${error.message}`);
      } else {
        result.upserted.synced_interviewai_users = 1;
      }
    }

    // --- synced_interviewai_sessions ---
    if (sessionsRes.status === "fulfilled") {
      const rows = sessionsRes.value;
      if (rows.length > 0) {
        const insertRows = rows.map((r) => ({
          external_user_id: externalUserId,
          external_session_id: r.id,
          company_name: r.company_name,
          session_type: r.session_type,
          industry: r.industry,
          phase: r.phase,
          status: r.status,
          overall_score: r.overall_score,
          skill_scores: r.skill_scores as object | null,
          strengths: r.strengths as object | null,
          areas_for_improvement: r.areas_for_improvement as object | null,
          growth_hint: r.growth_hint,
          conversation_text: r.conversation_text as object | null,
          started_at: dateToIso(r.started_at),
          original_created_at: dateToIso(r.original_created_at),
          synced_at: new Date().toISOString(),
        }));
        const { error } = await supabase
          .from("synced_interviewai_sessions")
          .upsert(insertRows, { onConflict: "external_session_id" });
        if (error) {
          result.errors.push(
            `synced_interviewai_sessions upsert: ${error.message}`,
          );
        } else {
          result.upserted.synced_interviewai_sessions = insertRows.length;
        }
      }
    } else {
      result.errors.push(
        `interview_sessions SELECT 失敗: ${errMsg(sessionsRes.reason)}`,
      );
    }

    // --- synced_interviewai_searches ---
    if (searchesRes.status === "fulfilled") {
      const rows = searchesRes.value;
      if (rows.length > 0) {
        const insertRows = rows.map((r) => ({
          external_user_id: externalUserId,
          external_search_id: r.id,
          company_name: r.company_name,
          searched_at: dateToIso(r.searched_at),
          synced_at: new Date().toISOString(),
        }));
        const { error } = await supabase
          .from("synced_interviewai_searches")
          .upsert(insertRows, { onConflict: "external_search_id" });
        if (error) {
          result.errors.push(
            `synced_interviewai_searches upsert: ${error.message}`,
          );
        } else {
          result.upserted.synced_interviewai_searches = insertRows.length;
        }
      }
    } else {
      result.errors.push(
        `user_company_searches SELECT 失敗: ${errMsg(searchesRes.reason)}`,
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
