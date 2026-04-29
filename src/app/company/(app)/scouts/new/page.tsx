import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScoutSendPage } from "@/features/company/app/scouts/components/scout-send-page";
import { sendScoutAction } from "@/features/company/app/scouts/actions";
import {
  getCompanyMembership,
  listPublishedJobPostings,
  getScoutsSentThisMonth,
} from "@/features/company/app/scouts/queries";

export const metadata = {
  title: "スカウト送信 | Executive Monograph",
};

export default async function NewScoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/company/login");

  const membership = await getCompanyMembership(user.id);
  if (!membership) redirect("/company/login");

  const [jobPostings, sentThisMonth] = await Promise.all([
    listPublishedJobPostings(membership.companyId),
    getScoutsSentThisMonth(membership.companyId),
  ]);

  return (
    <ScoutSendPage
      jobPostings={jobPostings}
      sentThisMonth={sentThisMonth}
      action={sendScoutAction}
    />
  );
}
