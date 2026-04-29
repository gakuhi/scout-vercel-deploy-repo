import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getCompanyMembership(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_members")
    .select("company_id, role")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    companyId: data.company_id,
    role: (data.role as string) ?? "member",
  };
}

export type JobPostingOption = {
  id: string;
  title: string;
};

export async function listPublishedJobPostings(
  companyId: string,
): Promise<JobPostingOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_postings")
    .select("id, title")
    .eq("company_id", companyId)
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function getScoutsSentThisMonth(
  companyId: string,
): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_plans")
    .select("scouts_sent_this_month")
    .eq("company_id", companyId)
    .maybeSingle();

  return data?.scouts_sent_this_month ?? 0;
}

export async function getAlreadyScoutedStudentIds(
  companyId: string,
  studentIds: string[],
  jobPostingId: string,
): Promise<string[]> {
  if (studentIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("scouts")
    .select("student_id")
    .eq("company_id", companyId)
    .eq("job_posting_id", jobPostingId)
    .in("student_id", studentIds);

  return (data ?? []).map((r) => r.student_id);
}
