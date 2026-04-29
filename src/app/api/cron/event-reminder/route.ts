import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/sync/shared";
// TODO: feat/company-notifications マージ後に有効化
// import { notifyEventReminder } from "@/features/company/app/notifications/create";

/**
 * イベントリマインダー cron バッチ
 *
 * 毎日定時（例: 朝9時 JST）に実行し、翌日開催のイベントを検出して
 * 該当イベントの作成者に通知を送る。
 *
 * 呼び出し例: Vercel Cron / 外部スケジューラから
 * GET /api/cron/event-reminder  (Authorization: Bearer <CRON_SECRET>)
 */
export async function GET(request: Request) {
  const authError = requireCronAuth(request.headers);
  if (authError) return authError;

  const supabase = createAdminClient();

  // 翌日の 00:00:00 〜 23:59:59 (JST) を UTC に変換して範囲検索
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffset);
  const tomorrowJst = new Date(jstNow);
  tomorrowJst.setDate(tomorrowJst.getDate() + 1);

  const tomorrowStart = new Date(
    Date.UTC(tomorrowJst.getFullYear(), tomorrowJst.getMonth(), tomorrowJst.getDate()) - jstOffset,
  );
  const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);

  // 翌日開催 & 公開済み & 未削除のイベントを検索
  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, created_by")
    .eq("is_published", true)
    .is("deleted_at", null)
    .gte("starts_at", tomorrowStart.toISOString())
    .lt("starts_at", tomorrowEnd.toISOString());

  if (error) {
    console.error("[cron/event-reminder] イベント検索エラー:", error);
    return NextResponse.json(
      { error: "イベントの検索に失敗しました" },
      { status: 500 },
    );
  }

  if (!events || events.length === 0) {
    return NextResponse.json({ message: "対象イベントなし", notified: 0 });
  }

  // 各イベントの作成者に通知を送る
  let notified = 0;
  const errors: string[] = [];

  for (const event of events) {
    try {
      // TODO: feat/company-notifications マージ後にコメント解除
      // await notifyEventReminder({
      //   createdBy: event.created_by,
      //   eventTitle: event.title,
      //   eventId: event.id,
      // });
      console.log(`[cron/event-reminder] 通知準備完了: ${event.title} → ${event.created_by}`);
      notified++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${event.id}: ${msg}`);
      console.error(`[cron/event-reminder] 通知失敗: ${event.id}`, e);
    }
  }

  return NextResponse.json({
    message: `${notified}件のリマインダーを処理しました`,
    notified,
    total: events.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
