import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentSearchView } from "@/features/company/app/students/components/student-search-view";
import { searchStudentsAction } from "@/features/company/app/students/actions";
import {
  getCompanyMembership,
  listSavedSearches,
} from "@/features/company/app/students/queries";

export const metadata = {
  title: "学生検索 | ScoutLink",
};

export default async function StudentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/company/login");

  const membership = await getCompanyMembership(user.id);
  if (!membership) redirect("/company/login");

  const savedSearches = await listSavedSearches(user.id);

  return (
    <StudentSearchView
      action={searchStudentsAction}
      savedSearches={savedSearches}
      canScout
    />
  );
}
