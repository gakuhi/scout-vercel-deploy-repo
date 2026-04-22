import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CompanyMemberRole } from "./schemas";

export type CompanyMember = {
  id: string;
  email: string;
  lastName: string | null;
  firstName: string | null;
  fullName: string;
  role: CompanyMemberRole;
  lastSignInAt: string | null;
};

export async function getCompanyIdForUser(
  userId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle();
  return data?.company_id ?? null;
}

export async function getCurrentUserRole(
  userId: string,
): Promise<CompanyMemberRole | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_members")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return (data?.role as CompanyMemberRole) ?? null;
}

export async function listCompanyMembers(
  companyId: string,
): Promise<CompanyMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_members")
    .select("id, email, last_name, first_name, role, last_sign_in_at")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    email: row.email,
    lastName: row.last_name,
    firstName: row.first_name,
    fullName:
      [row.last_name, row.first_name].filter(Boolean).join(" ") || row.email,
    role: (row.role ?? "member") as CompanyMemberRole,
    lastSignInAt: row.last_sign_in_at,
  }));
}
