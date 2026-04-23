import { connect } from "@planetscale/database";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getConsentedExternalUserIds,
  type SyncAllResult,
  type SyncUserResult,
} from "./shared";

/**
 * スマートES（PlanetScale MySQL）からの同期。
 *
 * 元テーブル:
 *   - user                                  → synced_smartes_users（マーカーのみ）
 *   - users_generated_applicant_motivations → synced_smartes_motivations
 *   - users_generated_gakuchika             → synced_smartes_gakuchika
 *   - users_generated_es                    → synced_smartes_generated_es
 *
 * ユーザー突合:
 *   email は PlanetScale read-only パスワードで user.email を直読みできる環境だが、
 *   他プロダクト（面接AI/企業分析AI/すごい就活）は state 経由で email を受ける設計に
 *   なっており、一貫性を優先して smartes でも state 経由の students.email のみを
 *   信頼する。synced_smartes_users.email は埋めず NULL のまま残す。
 *
 * ソースカラム名の前提:
 *   06-00 4.3 の日本語表記（「生成パラメーター」「生成本文」など）を以下のカラム名と
 *   解釈している。probe 等でズレが判明したら調整する。
 *     - users_generated_applicant_motivations: applicant_motivation_id, user_id,
 *       generated_params, generated_text, regenerated_count, generated_at, created_at
 *     - users_generated_gakuchika: gakuchika_id, user_id, generated_params,
 *       original_gakuchika_list, generated_text, regenerated_count, generated_at, created_at
 *     - users_generated_es: es_id, user_id, generated_params, original_es_list,
 *       generated_text, regenerated_count, generated_at, created_at
 */

const PRODUCT = "smartes" as const;

type PsRow = Record<string, unknown>;

function psConnect() {
  const host = process.env.SMARTES_PS_HOST;
  const username = process.env.SMARTES_PS_USER;
  const password = process.env.SMARTES_PS_PASS;
  if (!host || !username || !password) {
    throw new Error(
      "SMARTES_PS_HOST / SMARTES_PS_USER / SMARTES_PS_PASS が未設定",
    );
  }
  return connect({ host, username, password });
}

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

  const conn = psConnect();
  const supabase = createAdminClient();

  const [userRes, motivationsRes, gakuchikaRes, esRes] = await Promise.allSettled(
    [
      conn.execute(
        "SELECT `id`, `created_at` FROM `user` WHERE `id` = ? LIMIT 1",
        [externalUserId],
      ),
      conn.execute(
        "SELECT * FROM `users_generated_applicant_motivations` WHERE `user_id` = ?",
        [externalUserId],
      ),
      conn.execute(
        "SELECT * FROM `users_generated_gakuchika` WHERE `user_id` = ?",
        [externalUserId],
      ),
      conn.execute(
        "SELECT * FROM `users_generated_es` WHERE `user_id` = ?",
        [externalUserId],
      ),
    ],
  );

  // --- synced_smartes_users ---
  if (userRes.status === "fulfilled") {
    const row = (userRes.value.rows as PsRow[])[0];
    if (row) {
      const { error } = await supabase.from("synced_smartes_users").upsert(
        {
          external_user_id: externalUserId,
          original_created_at: toIsoOrNull(row.created_at),
          synced_at: new Date().toISOString(),
        },
        { onConflict: "external_user_id" },
      );
      if (error) {
        result.errors.push(`synced_smartes_users upsert: ${error.message}`);
      } else {
        result.upserted.synced_smartes_users = 1;
      }
    }
  } else {
    result.errors.push(`user SELECT 失敗: ${errMsg(userRes.reason)}`);
  }

  // --- synced_smartes_motivations ---
  if (motivationsRes.status === "fulfilled") {
    const rows = motivationsRes.value.rows as PsRow[];
    if (rows.length > 0) {
      const insertRows = rows.map((r) => ({
        external_user_id: externalUserId,
        external_motivation_id: String(r.applicant_motivation_id),
        generated_params: r.generated_params as object | null,
        generated_text: (r.generated_text as string | null) ?? null,
        regenerated_count: toIntOrNull(r.regenerated_count),
        generated_at: toIsoOrNull(r.generated_at),
        original_created_at: toIsoOrNull(r.created_at),
        synced_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("synced_smartes_motivations")
        .upsert(insertRows, { onConflict: "external_motivation_id" });
      if (error) {
        result.errors.push(`synced_smartes_motivations upsert: ${error.message}`);
      } else {
        result.upserted.synced_smartes_motivations = insertRows.length;
      }
    }
  } else {
    result.errors.push(
      `users_generated_applicant_motivations SELECT 失敗: ${errMsg(motivationsRes.reason)}`,
    );
  }

  // --- synced_smartes_gakuchika ---
  if (gakuchikaRes.status === "fulfilled") {
    const rows = gakuchikaRes.value.rows as PsRow[];
    if (rows.length > 0) {
      const insertRows = rows.map((r) => ({
        external_user_id: externalUserId,
        external_gakuchika_id: String(r.gakuchika_id),
        generated_params: r.generated_params as object | null,
        original_gakuchika_list: r.original_gakuchika_list as object | null,
        generated_text: (r.generated_text as string | null) ?? null,
        regenerated_count: toIntOrNull(r.regenerated_count),
        generated_at: toIsoOrNull(r.generated_at),
        original_created_at: toIsoOrNull(r.created_at),
        synced_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("synced_smartes_gakuchika")
        .upsert(insertRows, { onConflict: "external_gakuchika_id" });
      if (error) {
        result.errors.push(`synced_smartes_gakuchika upsert: ${error.message}`);
      } else {
        result.upserted.synced_smartes_gakuchika = insertRows.length;
      }
    }
  } else {
    result.errors.push(
      `users_generated_gakuchika SELECT 失敗: ${errMsg(gakuchikaRes.reason)}`,
    );
  }

  // --- synced_smartes_generated_es ---
  if (esRes.status === "fulfilled") {
    const rows = esRes.value.rows as PsRow[];
    if (rows.length > 0) {
      const insertRows = rows.map((r) => ({
        external_user_id: externalUserId,
        external_es_id: String(r.es_id),
        generated_params: r.generated_params as object | null,
        original_es_list: r.original_es_list as object | null,
        generated_text: (r.generated_text as string | null) ?? null,
        regenerated_count: toIntOrNull(r.regenerated_count),
        generated_at: toIsoOrNull(r.generated_at),
        original_created_at: toIsoOrNull(r.created_at),
        synced_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("synced_smartes_generated_es")
        .upsert(insertRows, { onConflict: "external_es_id" });
      if (error) {
        result.errors.push(
          `synced_smartes_generated_es upsert: ${error.message}`,
        );
      } else {
        result.upserted.synced_smartes_generated_es = insertRows.length;
      }
    }
  } else {
    result.errors.push(
      `users_generated_es SELECT 失敗: ${errMsg(esRes.reason)}`,
    );
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

export function toIsoOrNull(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString();
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function toIntOrNull(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number.parseInt(v, 10);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
