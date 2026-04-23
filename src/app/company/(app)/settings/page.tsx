import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanySettingsForm } from "@/features/company/app/settings/components/company-settings-form";
import { updateCompanyAction } from "@/features/company/app/settings/actions";
import {
  getCompanyById,
  getCompanyMembership,
} from "@/features/company/app/settings/queries";

export const metadata = {
  title: "企業プロフィール | Executive Monograph",
};

export default async function CompanySettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/company/login");
  const membership = await getCompanyMembership(user.id);
  if (!membership) redirect("/company/login");

  const company = await getCompanyById(membership.companyId);
  if (!company) {
    throw new Error(
      "company_members に所属があるが companies に該当レコードなし",
    );
  }

  const readOnly = membership.role !== "owner" && membership.role !== "admin";

  return (
    <CompanySettingsForm
      company={company}
      readOnly={readOnly}
      action={updateCompanyAction}
    />
  );
}
