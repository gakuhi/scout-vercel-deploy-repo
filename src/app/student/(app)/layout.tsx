import { getProfile } from "@/features/student/profile/actions";
import { StudentAppShell } from "@/features/student/shell/components/student-app-shell";
import {
  buildFullName,
  buildInitials,
} from "@/features/student/profile/utils";
import type { SidebarUser } from "@/features/student/shell/components/sidebar";

export default async function StudentAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  const user: SidebarUser | null = profile
    ? {
        imageUrl: profile.profile_image_url,
        name: buildFullName(profile.last_name, profile.first_name),
        initials: buildInitials(profile.last_name, profile.first_name),
        affiliation:
          [profile.university, profile.faculty].filter(Boolean).join(" ") ||
          "未設定",
      }
    : null;

  return <StudentAppShell user={user}>{children}</StudentAppShell>;
}
