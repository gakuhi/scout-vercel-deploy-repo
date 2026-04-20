import { redirect } from "next/navigation";
import { ProfileEditForm } from "@/features/student/profile/components/profile-edit-form";
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
    redirect("/student/auth/login");
  }

  return <ProfileEditForm profile={profile} mbtiTypes={mbtiTypes} />;
}
