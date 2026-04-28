import { redirect } from "next/navigation";
import { EventsView } from "@/features/student/events/components/events-view";
import {
  EVENTS_HERO,
  MOCK_APPLY_DEFAULTS,
  MOCK_EVENT_ITEMS,
} from "@/features/student/events/mock";
import {
  isApplyProfileComplete,
  loadApplyDefaults,
} from "@/features/student/events/lib/apply-defaults";
import { loadEventsData } from "@/features/student/events/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "イベント・セミナー | Scout",
};

export default async function StudentEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ mock?: string }>;
}) {
  const params = await searchParams;
  // ?mock=1 は本番では無効化（dev / preview のプレビュー用途）。
  const useMock =
    params.mock === "1" && process.env.NODE_ENV !== "production";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!useMock && !user) {
    redirect("/student/login");
  }

  // 実データ取得とプロフィール初期値の取得は独立しているので並列に。
  const [real, realApplyDefaults] = await Promise.all([
    useMock ? Promise.resolve(null) : loadEventsData(supabase, EVENTS_HERO),
    loadApplyDefaults(supabase, user),
  ]);

  // 明示 mock 指定、または開発環境で実データが空のときは mock にフォールバック。
  const shouldFallback =
    useMock ||
    (process.env.NODE_ENV === "development" &&
      (real?.events.length ?? 0) === 0);
  const data = shouldFallback
    ? { hero: EVENTS_HERO, events: MOCK_EVENT_ITEMS }
    : (real ?? { hero: EVENTS_HERO, events: [] });

  // ?mock=1 のときは未ログイン想定なので、ダイアログを開ける状態を再現するために
  // ダミーの applyDefaults を流す。実 DB 由来のときはそのまま使用。
  const applyDefaults = useMock ? MOCK_APPLY_DEFAULTS : realApplyDefaults;
  const profileIncomplete = !isApplyProfileComplete(applyDefaults);

  return (
    <EventsView
      data={data}
      applyDefaults={applyDefaults}
      profileIncomplete={profileIncomplete}
    />
  );
}
