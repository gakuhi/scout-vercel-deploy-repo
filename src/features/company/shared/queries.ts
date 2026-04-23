import "server-only";
import { createClient } from "@/lib/supabase/server";

export type CompanyMembership = {
  companyId: string;
  role: string;
};

export async function getCompanyMembership(
  userId: string,
): Promise<CompanyMembership | null> {
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

/** @deprecated getCompanyMembership を使用してください */
export async function getCompanyIdForUser(
  userId: string,
): Promise<string | null> {
  const m = await getCompanyMembership(userId);
  return m?.companyId ?? null;
}

/** @deprecated getCompanyMembership を使用してください */
export async function getCurrentUserRole(
  userId: string,
): Promise<string | null> {
  const m = await getCompanyMembership(userId);
  return m?.role ?? null;
}
