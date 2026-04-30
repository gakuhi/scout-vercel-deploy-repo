import { redirect } from "next/navigation";
import { HomeView } from "@/features/student/home/components/home-view";
import { fetchJournalArticles } from "@/features/student/home/lib/journal-feed";
import { getHomeData } from "@/features/student/home/lib/queries";
import { MOCK_HOME_DATA } from "@/features/student/home/mock";
import { getProfile } from "@/features/student/profile/queries";
import { computeProfileCompletion } from "@/features/student/profile/utils";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "ダッシュボード | Scout",
};

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mock?: string }>;
}) {
  const params = await searchParams;
  const useMock = params.mock === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!useMock && !user) {
    redirect("/student/login");
  }

  // profile / journal / homeData は相互依存しないため Promise.all で並列化。
  // 直列に await すると cold cache 時に 3 つの合計レイテンシが TTFB に直撃する。
  const [profile, journal, homeData] = await Promise.all([
    useMock ? Promise.resolve(null) : getProfile().catch(() => null),
    useMock ? Promise.resolve([]) : fetchJournalArticles().catch(() => []),
    useMock || !user ? Promise.resolve(null) : getHomeData().catch(() => null),
  ]);

  const displayName = profile
    ? [profile.last_name, profile.first_name].filter(Boolean).join(" ") ||
      MOCK_HOME_DATA.userName
    : ((user?.user_metadata?.display_name as string | undefined) ??
      user?.email?.split("@")[0] ??
      MOCK_HOME_DATA.userName);

  const profileCompletion = useMock
    ? MOCK_HOME_DATA.profileCompletion
    : computeProfileCompletion(profile);

  const data = {
    ...MOCK_HOME_DATA,
    userName: displayName,
    profileCompletion,
    journal: journal.length > 0 ? journal : MOCK_HOME_DATA.journal,
    ...(homeData && {
      inProgressScoutCount: homeData.inProgressScoutCount,
      newScoutCount: homeData.unreadScoutCount,
      unreadMessageCount: homeData.unreadMessageCount,
      unreadNotificationCount: homeData.unreadNotificationCount,
      scoutAlerts: homeData.scoutAlerts,
      unreadMessages: homeData.unreadMessages,
      featuredEvent: homeData.featuredEvent,
      subEvents: homeData.subEvents,
      notifications: homeData.notifications,
    }),
  };

  return <HomeView data={data} />;
}
