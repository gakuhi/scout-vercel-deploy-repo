"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ApplyError =
  | "unauthenticated"
  | "already_applied"
  | "event_not_found"
  | "deadline_passed"
  | "capacity_full"
  | "cancel_deadline_passed"
  | "unknown";

/** 開催 24 時間前を過ぎたらキャンセル不可。運営側の繰り上げ・準備に余裕を持たせるため。 */
const CANCEL_DEADLINE_HOURS_BEFORE_START = 24;

export type ApplyActionResult =
  | { ok: true }
  | { ok: false; error: ApplyError; message?: string };

/**
 * ApplyDialog から渡される申込フォーム入力。プロフィール由来の初期値を学生が編集した場合は
 * その編集後の値を、そのまま event_registrations に保存する。
 */
export type ApplyFormInput = {
  applicantName?: string;
  applicantEmail?: string;
  applicantAffiliation?: string;
  motivation?: string;
};

/**
 * イベント申込を作成する。
 *
 * 公開状態 / 締切 / 定員 / 既存行のチェックと INSERT/UPDATE を `register_for_event`
 * RPC に丸ごと委譲する。RPC 内で events 行を `FOR UPDATE` ロックしてから集計＋
 * 書き込みを行うので、残り 1 枠に対する同時応募でも capacity を厳密に守れる
 * (race condition なし)。
 */
export async function registerForEvent(
  eventId: string,
  form: ApplyFormInput = {},
): Promise<ApplyActionResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("register_for_event", {
    p_event_id: eventId,
    p_applicant_name: form.applicantName ?? null,
    p_applicant_email: form.applicantEmail ?? null,
    p_applicant_affiliation: form.applicantAffiliation ?? null,
    p_motivation: form.motivation ?? null,
  });

  if (error) {
    return { ok: false, error: "unknown", message: error.message };
  }

  // RPC は jsonb で { ok: true } または { ok: false, error: <ApplyError> } を返す。
  const result = data as { ok: boolean; error?: ApplyError };
  if (!result.ok) {
    return { ok: false, error: result.error ?? "unknown" };
  }

  revalidatePath("/student/events");
  revalidatePath(`/student/events/${eventId}`);
  return { ok: true };
}

/**
 * 申込をキャンセルする（status='cancelled' + cancelled_at 更新）。
 *
 * 開催 {@link CANCEL_DEADLINE_HOURS_BEFORE_START} 時間前を過ぎたキャンセルは
 * サーバ側で拒否する。運営側の準備・繰り上げに余裕を持たせるため。
 */
export async function cancelEventRegistration(
  eventId: string,
): Promise<ApplyActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // キャンセル可否判定のため starts_at を取得する。
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("starts_at")
    .eq("id", eventId)
    .maybeSingle();
  if (eventErr || !event) return { ok: false, error: "event_not_found" };

  const startsAtMs = new Date(event.starts_at).getTime();
  const cancelDeadlineMs =
    startsAtMs - CANCEL_DEADLINE_HOURS_BEFORE_START * 60 * 60 * 1000;
  if (Date.now() > cancelDeadlineMs) {
    return { ok: false, error: "cancel_deadline_passed" };
  }

  const { error } = await supabase
    .from("event_registrations")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("student_id", user.id)
    .eq("status", "applied");

  if (error) return { ok: false, error: "unknown", message: error.message };

  revalidatePath("/student/events");
  revalidatePath(`/student/events/${eventId}`);
  return { ok: true };
}
