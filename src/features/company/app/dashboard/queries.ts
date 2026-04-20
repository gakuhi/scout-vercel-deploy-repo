import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/shared/types/database";

type ScoutStatus = Database["public"]["Enums"]["scout_status"];

export type ActiveStudent = {
  id: string;
  studentId: string;
  name: string;
  university: string | null;
  prefecture: string | null;
  status: ScoutStatus;
  sentAt: string;
};

export type DashboardData = {
  companyName: string;
  memberName: string;
  totals: {
    activeStudents: number;
    totalScoutsSent: number;
    acceptanceRate: number;
    remainingScouts: number;
  };
  unconfirmedMessages: number;
  activeStudents: ActiveStudent[];
};

export async function getCompanyContext(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_members")
    .select(
      "id, last_name, first_name, company_id, companies!inner(id, name)",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  const company = data.companies as unknown as
    | { id: string; name: string }
    | null;
  return {
    memberId: data.id,
    companyId: data.company_id,
    companyName: company?.name ?? "",
    memberName: [data.last_name, data.first_name].filter(Boolean).join(" "),
  };
}

export async function getDashboardData(
  userId: string,
): Promise<DashboardData | null> {
  const context = await getCompanyContext(userId);
  if (!context) return null;

  const supabase = await createClient();
  const { companyId } = context;

  const [
    activeStudentsRes,
    scoutStatusesRes,
    unconfirmedRes,
    companyPlanRes,
    activeScoutsRes,
  ] = await Promise.all([
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("is_profile_public", true)
      .is("deleted_at", null),
    supabase.from("scouts").select("status").eq("company_id", companyId),
    supabase
      .from("chat_messages")
      .select("id, scouts!inner(company_id)", { count: "exact", head: true })
      .eq("sender_role", "student")
      .is("read_at", null)
      .eq("scouts.company_id", companyId),
    supabase
      .from("company_plans")
      .select("scout_quota, scouts_sent_this_month")
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("scouts")
      .select(
        `id, status, sent_at,
         students!inner(id, last_name, first_name, university, prefecture)`,
      )
      .eq("company_id", companyId)
      .in("status", ["sent", "read", "accepted"])
      .order("sent_at", { ascending: false })
      .limit(5),
  ]);

  const allStatuses = (scoutStatusesRes.data ?? []).map(
    (r) => r.status as ScoutStatus | null,
  );
  const totalSent = allStatuses.length;
  const acceptedCount = allStatuses.filter((s) => s === "accepted").length;
  const acceptanceRate =
    totalSent > 0 ? Math.round((acceptedCount / totalSent) * 100) : 0;

  const plan = companyPlanRes.data;
  const remainingScouts = plan
    ? Math.max(0, (plan.scout_quota ?? 0) - (plan.scouts_sent_this_month ?? 0))
    : 0;

  type ScoutRow = {
    id: string;
    status: ScoutStatus;
    sent_at: string | null;
    students: {
      id: string;
      last_name: string | null;
      first_name: string | null;
      university: string | null;
      prefecture: string | null;
    } | null;
  };

  const activeStudents: ActiveStudent[] = (
    (activeScoutsRes.data ?? []) as unknown as ScoutRow[]
  ).map((row) => {
    const s = row.students;
    return {
      id: row.id,
      studentId: s?.id ?? "",
      name: [s?.last_name, s?.first_name].filter(Boolean).join(" ") || "匿名",
      university: s?.university ?? null,
      prefecture: s?.prefecture ?? null,
      status: row.status,
      sentAt: row.sent_at ?? new Date().toISOString(),
    };
  });

  return {
    companyName: context.companyName,
    memberName: context.memberName,
    totals: {
      activeStudents: activeStudentsRes.count ?? 0,
      totalScoutsSent: totalSent,
      acceptanceRate,
      remainingScouts,
    },
    unconfirmedMessages: unconfirmedRes.count ?? 0,
    activeStudents,
  };
}
