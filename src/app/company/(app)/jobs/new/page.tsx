import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/auth";
import { JobForm } from "@/features/company/app/jobs/components/job-form";
import { createJobAction } from "@/features/company/app/jobs/actions/save";
import { getCompanyMembership } from "@/features/company/app/jobs/queries";

export const metadata = {
  title: "新規求人作成 | ScoutLink",
};

export default async function NewJobPage() {
  const user = await getAuthUser();
  if (!user) redirect("/company/login");

  const membership = await getCompanyMembership(user.id);
  if (!membership) redirect("/company/login");
  if (membership.role !== "owner" && membership.role !== "admin") {
    redirect("/company/jobs");
  }

  return <JobForm action={createJobAction} />;
}
