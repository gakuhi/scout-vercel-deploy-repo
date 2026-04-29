import "server-only";
import { createClient } from "@/lib/supabase/server";

export type JobPosting = {
  id: string;
  title: string;
  jobType: string | null;
  jobCategory: string | null;
  employmentType: string | null;
  salaryRange: string | null;
  workLocation: string | null;
  description: string | null;
  requirements: string | null;
  benefits: string | null;
  targetGraduationYears: number[];
  heroImagePath: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type JobListItem = {
  id: string;
  title: string;
  jobType: string | null;
  jobCategory: string | null;
  employmentType: string | null;
  salaryRange: string | null;
  workLocation: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string | null;
};

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

export async function listJobPostings(
  companyId: string,
): Promise<JobListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_postings")
    .select(
      "id, title, job_type, job_category, employment_type, salary_range, work_location, is_published, published_at, created_at",
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    jobType: row.job_type ?? null,
    jobCategory: row.job_category,
    employmentType: row.employment_type,
    salaryRange: row.salary_range,
    workLocation: row.work_location,
    isPublished: row.is_published ?? false,
    publishedAt: row.published_at,
    createdAt: row.created_at,
  }));
}

export async function getJobPostingById(
  jobId: string,
  companyId: string,
): Promise<JobPosting | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_postings")
    .select("*")
    .eq("id", jobId)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    title: data.title,
    jobType: data.job_type ?? null,
    jobCategory: data.job_category,
    employmentType: data.employment_type,
    salaryRange: data.salary_range,
    workLocation: data.work_location,
    description: data.description,
    requirements: data.requirements,
    benefits: data.benefits,
    targetGraduationYears: Array.isArray(data.target_graduation_years) ? data.target_graduation_years : [],
    heroImagePath: data.hero_image_path ?? null,
    isPublished: data.is_published ?? false,
    publishedAt: data.published_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
