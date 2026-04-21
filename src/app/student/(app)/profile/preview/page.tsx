import { redirect } from "next/navigation";
import { ProfilePreview } from "@/features/student/profile/components/profile-preview";
import { getProfileViewData } from "@/features/student/profile/actions";

export const dynamic = "force-dynamic";

export default async function StudentProfilePreviewPage() {
  const data = await getProfileViewData();

  if (!data) {
    redirect("/student/login");
  }

  return <ProfilePreview data={data} />;
}
