import { redirect } from "next/navigation";
import { ProfileView } from "@/features/student/profile/components/profile-view";
import { SaveToast } from "@/features/student/profile/components/save-toast";
import { getProfileViewData } from "@/features/student/profile/actions";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [data, params] = await Promise.all([
    getProfileViewData(),
    searchParams,
  ]);

  if (!data) {
    redirect("/student/login");
  }

  return (
    <>
      {params.saved === "1" && <SaveToast />}
      <ProfileView data={data} pendingEmail={data.pendingEmail} />
    </>
  );
}
