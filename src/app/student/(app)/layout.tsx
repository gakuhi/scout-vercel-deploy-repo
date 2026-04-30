import { getProfile } from "@/features/student/profile/queries";
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
  // queries.ts 経由で React.cache 版を呼ぶことで dashboard page と DB アクセスを 1 回に集約
  const profile = await getProfile().catch(() => null);
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
