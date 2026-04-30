import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobListView } from "@/features/company/app/jobs/components/job-list-view";
import {
  getCompanyMembership,
  listJobPostings,
} from "@/features/company/app/jobs/queries";

export const metadata = {
  title: "求人管理 | ScoutLink",
};

export default async function JobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/company/login");

  const membership = await getCompanyMembership(user.id);
  if (!membership) redirect("/company/login");

  const jobs = await listJobPostings(membership.companyId);
  const isEditable =
    membership.role === "owner" || membership.role === "admin";

  return <JobListView jobs={jobs} isEditable={isEditable} />;
}
