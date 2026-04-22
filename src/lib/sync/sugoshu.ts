import { createAdminClient } from "@/lib/supabase/admin";
import {
  getConsentedExternalUserIds,
  type SyncAllResult,
  type SyncUserResult,
} from "./shared";

/**
 * すごい就活（Bubble Data API）からの同期。
 *
 * 元テーブル（Bubble 型名）:
 *   - User              → synced_sugoshu_users（UserProfile と結合）
 *   - UserProfile       → synced_sugoshu_users
 *   - ResumeDraft       → synced_sugoshu_resumes
 *   - UserDiagnosisSession → synced_sugoshu_diagnoses
 *
 * ユーザー突合:
 *   Bubble 側の User._id を student_product_links.external_user_id に保存する。
 *   同時登録時に state 経由で email を受け取り students.email として保持しており、
 *   Bubble から email 取得は不要。synced_sugoshu_users.email は nullable にしてあり
 *   （migration: 20260422000000）、ここでは埋めずに NULL のまま残す。
 */

const PRODUCT = "sugoshu" as const;
const BUBBLE_TIMEOUT_MS = 15_000;
const BUBBLE_PAGE_LIMIT = 100;

type BubbleListResponse<T = BubbleRecord> = {
  response?: {
    results?: T[];
    cursor?: number;
    remaining?: number;
    count?: number;
  };
};

type BubbleRecord = Record<string, unknown> & { _id?: string };

type BubbleUser = BubbleRecord & {
  _id: string;
  "Created Date"?: string;
};

type BubbleResumeDraft = BubbleRecord & {
  _id: string;
  "Created By"?: string;
  "Created Date"?: string;
  self_pr?: string;
  motivation?: string;
  hobby_skill?: string;
  personal_request?: string;
};

type BubbleDiagnosisSession = BubbleRecord & {
  _id: string;
  "Created By"?: string;
  "Created Date"?: string;
  completed_at?: string;
  Slug?: string;
  result_vector?: unknown;
};

/**
 * 1 ユーザー分の同期（オンデマンド）。
 * 同時登録・データ連携同意・手動リフレッシュから呼ばれる想定。
 */
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

  // Bubble から4種類のレコードを並行取得。1つ失敗しても他を止めない。
  // 制約キー:
  //   - ResumeDraft: 現状 "Created By"（custom な user 参照フィールドが見当たらない）
  //   - UserDiagnosisSession: custom の `user` フィールドで絞る（probe 結果で確認済み）
  const [userRes, resumesRes, diagnosesRes] = await Promise.allSettled([
    fetchBubbleUserById(externalUserId),
    fetchBubbleListByUser<BubbleResumeDraft>(
      "ResumeDraft",
      "Created By",
      externalUserId,
    ),
    fetchBubbleListByUser<BubbleDiagnosisSession>(
      "UserDiagnosisSession",
      "user",
      externalUserId,
    ),
  ]);

  const supabase = createAdminClient();

  // --- synced_sugoshu_users ---
  // email は students.email 経由で別途管理されており、この表では nullable。
  // 本行は「このユーザーを同期した」マーカーとしての役割のみ。
  if (userRes.status === "fulfilled" && userRes.value) {
    const createdAt = toIsoOrNull(userRes.value["Created Date"]);
    const { error } = await supabase.from("synced_sugoshu_users").upsert(
      {
        external_user_id: externalUserId,
        original_created_at: createdAt,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "external_user_id" },
    );
    if (error) {
      result.errors.push(`synced_sugoshu_users upsert: ${error.message}`);
    } else {
      result.upserted.synced_sugoshu_users = 1;
    }
  } else if (userRes.status === "rejected") {
    result.errors.push(`Bubble User 取得失敗: ${errMsg(userRes.reason)}`);
  }

  // --- synced_sugoshu_resumes ---
  if (resumesRes.status === "fulfilled") {
    const drafts = resumesRes.value;
    if (drafts.length > 0) {
      const rows = drafts.map((d) => ({
        external_user_id: externalUserId,
        external_resume_id: d._id,
        content: buildResumeContent(d),
        original_created_at: toIsoOrNull(d["Created Date"]),
        synced_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("synced_sugoshu_resumes")
        .upsert(rows, { onConflict: "external_resume_id" });
      if (error) {
        result.errors.push(`synced_sugoshu_resumes upsert: ${error.message}`);
      } else {
        result.upserted.synced_sugoshu_resumes = rows.length;
      }
    }
  } else {
    result.errors.push(
      `Bubble ResumeDraft 取得失敗: ${errMsg(resumesRes.reason)}`,
    );
  }

  // --- synced_sugoshu_diagnoses ---
  if (diagnosesRes.status === "fulfilled") {
    const sessions = diagnosesRes.value;
    if (sessions.length > 0) {
      const rows = sessions.map((s) => ({
        external_user_id: externalUserId,
        external_diagnosis_id: s._id,
        diagnosis_data: {
          result_vector: s.result_vector ?? null,
          slug: s.Slug ?? null,
          completed_at: s.completed_at ?? null,
        },
        original_created_at: toIsoOrNull(s["Created Date"]),
        synced_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("synced_sugoshu_diagnoses")
        .upsert(rows, { onConflict: "external_diagnosis_id" });
      if (error) {
        result.errors.push(
          `synced_sugoshu_diagnoses upsert: ${error.message}`,
        );
      } else {
        result.upserted.synced_sugoshu_diagnoses = rows.length;
      }
    }
  } else {
    result.errors.push(
      `Bubble UserDiagnosisSession 取得失敗: ${errMsg(diagnosesRes.reason)}`,
    );
  }

  result.ok = result.errors.length === 0;
  return result;
}

/**
 * 同意済み全ユーザーを対象に同期（日次 Cron）。
 * `syncUser` をループする単純実装。Bubble の rate limit に当たる可能性があるが、
 * Phase B 初版ではまず動く状態を優先する。後で差分同期に最適化する。
 */
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
      result.errors.push(
        `${externalId}: ${userResult.errors.join(" / ")}`,
      );
    }
    for (const [table, count] of Object.entries(userResult.upserted)) {
      result.upsertedTotal[table] = (result.upsertedTotal[table] ?? 0) + count;
    }
  }

  return result;
}

// =============================================================
// Bubble API ヘルパー
// =============================================================

function bubbleAuthHeader(): { Authorization: string } {
  const key = process.env.SUGOSHU_BUBBLE_API_KEY;
  if (!key) {
    throw new Error("SUGOSHU_BUBBLE_API_KEY is not set");
  }
  return { Authorization: `Bearer ${key}` };
}

function bubbleBaseUrl(): string {
  const url = process.env.SUGOSHU_BUBBLE_API_URL;
  if (!url) {
    throw new Error("SUGOSHU_BUBBLE_API_URL is not set");
  }
  return url.replace(/\/+$/, "");
}

async function fetchBubbleUserById(
  externalUserId: string,
): Promise<BubbleUser | null> {
  const url = `${bubbleBaseUrl()}/User/${encodeURIComponent(externalUserId)}`;
  const res = await fetch(url, {
    headers: bubbleAuthHeader(),
    signal: AbortSignal.timeout(BUBBLE_TIMEOUT_MS),
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Bubble User GET failed: ${res.status}`);
  }

  const json = (await res.json()) as { response?: BubbleUser };
  return json.response ?? null;
}

/**
 * Bubble の指定 constraint でレコードを全件取得する（ページネーション対応）。
 * Bubble の list API は1リクエスト最大100件なので、`remaining > 0` ならカーソルを進める。
 */
async function fetchBubbleListByUser<T extends BubbleRecord>(
  type: string,
  constraintKey: string,
  userId: string,
): Promise<T[]> {
  const base = bubbleBaseUrl();
  const constraints = JSON.stringify([
    { key: constraintKey, constraint_type: "equals", value: userId },
  ]);

  const all: T[] = [];
  let cursor = 0;

  // 防御的に最大 50 ページ（5000件）までで打ち切る
  for (let page = 0; page < 50; page += 1) {
    const url =
      `${base}/${encodeURIComponent(type)}` +
      `?limit=${BUBBLE_PAGE_LIMIT}&cursor=${cursor}` +
      `&constraints=${encodeURIComponent(constraints)}`;

    const res = await fetch(url, {
      headers: bubbleAuthHeader(),
      signal: AbortSignal.timeout(BUBBLE_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "<no body>");
      throw new Error(
        `Bubble ${type} list GET failed: ${res.status} body=${body.slice(0, 300)}`,
      );
    }

    const json = (await res.json()) as BubbleListResponse<T>;
    const results = json.response?.results ?? [];
    all.push(...results);

    const remaining = json.response?.remaining ?? 0;
    if (remaining <= 0) break;
    cursor += results.length;
  }

  return all;
}

// =============================================================
// 変換ヘルパー
// =============================================================

function buildResumeContent(d: BubbleResumeDraft): string | null {
  const parts: string[] = [];
  if (d.self_pr?.trim()) parts.push(`【自己PR】\n${d.self_pr.trim()}`);
  if (d.motivation?.trim()) parts.push(`【志望動機】\n${d.motivation.trim()}`);
  if (d.hobby_skill?.trim())
    parts.push(`【趣味・特技】\n${d.hobby_skill.trim()}`);
  if (d.personal_request?.trim())
    parts.push(`【その他要望】\n${d.personal_request.trim()}`);
  return parts.length > 0 ? parts.join("\n\n") : null;
}

function toIsoOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
