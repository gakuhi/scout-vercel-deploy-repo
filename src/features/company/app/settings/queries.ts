import "server-only";
import { createClient } from "@/lib/supabase/server";

export { getCompanyIdForUser, getCurrentUserRole, getCompanyMembership } from "@/features/company/shared/queries";

export type CompanyProfile = {
  id: string;
  name: string;
  industry: string | null;
  employeeCountRange: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  description: string | null;
  prefecture: string | null;
  postalCode: string | null;
  city: string | null;
  street: string | null;
  phone: string | null;
  isVerified: boolean;
  updatedAt: string | null;
};

export async function getCompanyById(
  companyId: string,
): Promise<CompanyProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select(
      `id, name, industry, employee_count_range, website_url, logo_url,
       description, prefecture, postal_code, city, street, phone, is_verified, updated_at`,
    )
    .eq("id", companyId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    industry: data.industry,
    employeeCountRange: data.employee_count_range,
    websiteUrl: data.website_url,
    logoUrl: data.logo_url,
    description: data.description,
    prefecture: data.prefecture,
    postalCode: data.postal_code,
    city: data.city,
    street: data.street,
    phone: data.phone,
    isVerified: data.is_verified ?? false,
    updatedAt: data.updated_at ?? null,
  };
}
