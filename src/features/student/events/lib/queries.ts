import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/types/database";
import type { EventDetail, EventItem, EventsData } from "../schema";
import {
  applyRemainingCapacity,
  mapDbEventToEventDetail,
  mapDbEventToEventItem,
  type DbEventRow,
} from "./mappers";

type DbClient = SupabaseClient<Database>;

/**
 * events テーブルから取得する最小カラム。Database 型から派生して型ずれを防ぐ。
 */
type EventRowFromDb = Pick<
  Database["public"]["Tables"]["events"]["Row"],
  | "id"
  | "title"
  | "description"
  | "event_type"
  | "format"
  | "location"
  | "online_url"
  | "starts_at"
  | "ends_at"
  | "capacity"
  | "application_deadline"
  | "target_graduation_year"
>;

const EVENT_COLUMNS =
  "id, title, description, event_type, format, location, online_url, starts_at, ends_at, capacity, application_deadline, target_graduation_year";

/** EventRowFromDb (DB 型) を mappers.ts の DbEventRow (UI 用) に詰め替え。 */
function toMapperRow(row: EventRowFromDb): DbEventRow {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    event_type: row.event_type,
    format: row.format,
    location: row.location,
    online_url: row.online_url,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    capacity: row.capacity,
    application_deadline: row.application_deadline,
    target_graduation_year: row.target_graduation_year,
  };
}

/**
 * 学生向けに公開されているイベント一覧を取得する。
 * RLS で is_published=true / deleted_at IS NULL / platform or 審査済み企業主催のみに絞られる前提。
 */
export async function listPublishedEvents(
  supabase: DbClient,
): Promise<EventItem[]> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .order("starts_at", { ascending: true });

  if (error) throw error;
  const rows = (data ?? []) as EventRowFromDb[];
  if (rows.length === 0) return [];

  const appliedCounts = await fetchAppliedCounts(
    supabase,
    rows.map((r) => r.id),
  );

  return rows.map((row) =>
    applyRemainingCapacity(mapDbEventToEventItem(toMapperRow(row)), appliedCounts),
  );
}

/**
 * イベント詳細を 1 件取得。見つからなければ null。
 * DB に speakers / schedule / access のカラムは無いため、それらは空で返る。
 */
export async function getPublishedEventById(
  supabase: DbClient,
  id: string,
): Promise<EventDetail | null> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as EventRowFromDb;
  const appliedCount = await fetchAppliedCountForEvent(supabase, row.id);

  return mapDbEventToEventDetail(toMapperRow(row), { appliedCount });
}

/**
 * 現在ログイン中の学生が「申込中 (status='applied')」にしている event_id 一覧。
 * RLS により他学生の行は見えないが、意図を明示するため student_id でも明示的に絞る。
 */
export async function listMyActiveRegistrationEventIds(
  supabase: DbClient,
): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("event_registrations")
    .select("event_id")
    .eq("student_id", user.id)
    .eq("status", "applied");

  if (error) throw error;
  return (data ?? []).map((row) => row.event_id);
}

// ---- 以下、内部ヘルパ ----

async function fetchAppliedCounts(
  supabase: DbClient,
  eventIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (eventIds.length === 0) return counts;

  // 学生ロールの RLS では他学生の registration が見えないので、
  // 集計は SECURITY DEFINER の RPC 関数経由で取得する。
  // RPC が schema cache に無い (migration 未適用) などで失敗しても、
  // 残席表示が「制限なし」扱いに倒れるだけで一覧自体は描画させたいため
  // fail-soft にする。エラーは運用ログで気付けるよう error 出力する。
  const { data, error } = await supabase.rpc("get_event_applied_counts", {
    event_ids: eventIds,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error(
      "[fetchAppliedCounts] get_event_applied_counts RPC failed:",
      error,
    );
    return counts;
  }

  for (const row of data ?? []) {
    counts.set(row.event_id, Number(row.applied_count));
  }
  return counts;
}

async function fetchAppliedCountForEvent(
  supabase: DbClient,
  eventId: string,
): Promise<number> {
  const { data, error } = await supabase.rpc("get_event_applied_counts", {
    event_ids: [eventId],
  });
  if (error) {
    // 詳細画面でも fail-soft。残席は「制限なし」扱いになり申込ボタンは押せる。
    // eslint-disable-next-line no-console
    console.error(
      "[fetchAppliedCountForEvent] get_event_applied_counts RPC failed:",
      error,
    );
    return 0;
  }
  const row = (data ?? []).find((r) => r.event_id === eventId);
  return row ? Number(row.applied_count) : 0;
}

/**
 * ページ全体で使いたいときの便利ラッパ。hero はビュー側の固定データを流用する。
 */
export async function loadEventsData(
  supabase: DbClient,
  hero: EventsData["hero"],
): Promise<EventsData> {
  const events = await listPublishedEvents(supabase);
  return { hero, events };
}
