import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MemberListView } from "@/features/company/app/members/components/member-list-view";
import {
  getCompanyIdForUser,
  getCurrentUserRole,
  listCompanyMembers,
} from "@/features/company/app/members/queries";

export const metadata = {
  title: "メンバー管理 | ScoutLink",
};

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/company/login");
  const companyId = await getCompanyIdForUser(user.id);
  if (!companyId) redirect("/company/login");

  const [members, currentUserRole] = await Promise.all([
    listCompanyMembers(companyId),
    getCurrentUserRole(user.id),
  ]);

  return (
    <MemberListView
      members={members}
      currentUserId={user.id}
      currentUserRole={currentUserRole}
    />
  );
}
