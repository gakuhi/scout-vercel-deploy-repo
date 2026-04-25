import { redirect } from "next/navigation";
import { ProfileForm } from "@/features/student/profile/components/profile-form";
import {
  getProfile,
  getMbtiTypes,
} from "@/features/student/profile/actions";

export const dynamic = "force-dynamic";

export default async function StudentProfileEditPage() {
  const [profile, mbtiTypes] = await Promise.all([
    getProfile(),
    getMbtiTypes(),
  ]);

  if (!profile) {
    redirect("/student/login");
  }

  return <ProfileForm mode="edit" profile={profile} mbtiTypes={mbtiTypes} />;
}
