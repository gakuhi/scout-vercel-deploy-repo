import { notFound, redirect } from "next/navigation";
import { EventDetailView } from "@/features/student/events/components/event-detail-view";
import {
  MOCK_APPLY_DEFAULTS,
  MOCK_EVENT_DETAILS,
} from "@/features/student/events/mock";
import {
  isApplyProfileComplete,
  loadApplyDefaults,
} from "@/features/student/events/lib/apply-defaults";
import { getPublishedEventById } from "@/features/student/events/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  try {
    const detail = await getPublishedEventById(supabase, id);
    if (detail) return { title: `${detail.title} | Scout` };
    // 開発環境では DB が空の可能性があるので mock を見る。
    if (process.env.NODE_ENV === "development") {
      const mock = MOCK_EVENT_DETAILS[id];
      if (mock) return { title: `${mock.title} | Scout` };
    }
    return { title: "イベント | Scout" };
  } catch {
    return { title: "イベント | Scout" };
  }
}

/**
 * 学生向けイベント詳細画面。
 * - 未ログインなら /student/login にリダイレクト（?mock=1 で回避可）
 * - 公開されていない / 存在しない id は 404（RLS で not found になる）
 */
export default async function StudentEventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mock?: string }>;
}) {
  const [{ id }, { mock }] = await Promise.all([params, searchParams]);
  // ?mock=1 は本番では無効化（dev / preview のプレビュー用途）。
  const useMock = mock === "1" && process.env.NODE_ENV !== "production";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!useMock && !user) {
    redirect("/student/login");
  }

  // 実データ取得とプロフィール初期値の取得は独立しているので並列に。
  const [real, realApplyDefaults] = await Promise.all([
    useMock
      ? Promise.resolve(null)
      : getPublishedEventById(supabase, id),
    loadApplyDefaults(supabase, user),
  ]);

  // 明示 mock 指定、または開発環境で DB に当該行が無い場合は mock を参照する。
  const shouldFallback =
    useMock || (process.env.NODE_ENV === "development" && real === null);
  const detail = shouldFallback ? (MOCK_EVENT_DETAILS[id] ?? null) : real;
  if (!detail) {
    notFound();
  }

  // ?mock=1 のときはダミーのプロフィール値を流して申込ダイアログを開ける状態にする。
  const applyDefaults = useMock ? MOCK_APPLY_DEFAULTS : realApplyDefaults;
  const profileIncomplete = !isApplyProfileComplete(applyDefaults);

  return (
    <EventDetailView
      detail={detail}
      applyDefaults={applyDefaults}
      profileIncomplete={profileIncomplete}
    />
  );
}
