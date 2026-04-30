import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobForm } from "@/features/company/app/jobs/components/job-form";
import { updateJobAction } from "@/features/company/app/jobs/actions/save";
import {
  getCompanyMembership,
  getJobPostingById,
} from "@/features/company/app/jobs/queries";

export const metadata = {
  title: "求人編集 | ScoutLink",
};

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/company/login");

  const membership = await getCompanyMembership(user.id);
  if (!membership) redirect("/company/login");
  if (membership.role !== "owner" && membership.role !== "admin") {
    redirect("/company/jobs");
  }

  const job = await getJobPostingById(id, membership.companyId);
  if (!job) notFound();

  return <JobForm job={job} action={updateJobAction} />;
}
