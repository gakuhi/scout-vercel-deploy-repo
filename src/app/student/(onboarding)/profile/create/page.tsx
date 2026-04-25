import { redirect } from "next/navigation";
import { ProfileForm } from "@/features/student/profile/components/profile-form";
import { getProfile, getMbtiTypes } from "@/features/student/profile/actions";
import { isProfileComplete } from "@/features/student/profile/utils";

export const dynamic = "force-dynamic";

export default async function StudentProfileCreatePage() {
  const [profile, mbtiTypes] = await Promise.all([
    getProfile(),
    getMbtiTypes(),
  ]);

  if (!profile) {
    redirect("/student/login");
  }

  // 既にプロフィール作成済みのユーザーが直接アクセスした場合はダッシュボードへ。
  // 完成度判定は utils の isProfileComplete に集約（LINE callback と共有）。
  if (isProfileComplete(profile)) {
    redirect("/student/dashboard");
  }

  return <ProfileForm mode="create" profile={profile} mbtiTypes={mbtiTypes} />;
}
