import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScoutListView } from "@/features/company/app/scouts/components/scout-list-view";
import {
  getCompanyMembership,
  listScouts,
  getScoutsSentThisMonth,
} from "@/features/company/app/scouts/queries";

export const metadata = {
  title: "スカウト履歴 | Executive Monograph",
};

export default async function ScoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/company/login");

  const membership = await getCompanyMembership(user.id);
  if (!membership) redirect("/company/login");

  const [scouts, sentThisMonth] = await Promise.all([
    listScouts(membership.companyId),
    getScoutsSentThisMonth(membership.companyId),
  ]);

  return <ScoutListView scouts={scouts} sentThisMonth={sentThisMonth} />;
}
