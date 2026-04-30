import "server-only";
import { createClient } from "@/lib/supabase/server";
import { scoutStatusSchema } from "./schemas";
import type { ScoutStatus, ScoutListItem } from "./schemas";
export type { ScoutStatus, ScoutListItem } from "./schemas";

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

// --- スカウト一覧（送信済み） ---

export async function listScouts(
  companyId: string,
  statusFilter?: ScoutStatus,
): Promise<ScoutListItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("scouts")
    .select(
      "id, subject, message, status, sent_at, read_at, responded_at, expires_at, student_id, students(university, faculty, last_name, first_name), job_postings(title)",
    )
    .eq("company_id", companyId)
    .order("sent_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error("listScouts error:", error);
    return [];
  }
  if (!data) return [];

  return data.map((row) => {
    const student = row.students as unknown as {
      university: string | null;
      faculty: string | null;
      last_name: string | null;
      first_name: string | null;
    } | null;
    const job = row.job_postings as unknown as { title: string | null } | null;

    const status = scoutStatusSchema.catch("sent").parse(row.status);
    // 学生検索画面 (students/queries.ts) と同様、承諾前は氏名をクライアントに渡さない。
    const studentName =
      status === "accepted"
        ? [student?.last_name, student?.first_name].filter(Boolean).join(" ") ||
          null
        : null;

    return {
      id: row.id,
      subject: row.subject,
      message: row.message,
      status,
      sentAt: row.sent_at,
      readAt: row.read_at,
      respondedAt: row.responded_at,
      expiresAt: row.expires_at,
      studentId: row.student_id,
      studentUniversity: student?.university ?? null,
      studentFaculty: student?.faculty ?? null,
      studentName,
      jobPostingTitle: job?.title ?? null,
    };
  });
}

// --- スカウト送信用クエリ ---

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
