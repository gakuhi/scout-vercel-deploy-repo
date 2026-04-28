import { redirect } from "next/navigation";
import { getSettingsData } from "@/features/student/settings/actions";
import { SettingsForm } from "@/features/student/settings/components/settings-form";
import { MOCK_NOTIFICATION_SETTINGS } from "@/features/student/settings/mock-notifications";

export const dynamic = "force-dynamic";

export default async function StudentSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ mock?: string }>;
}) {
  const params = await searchParams;
  const useMock = params.mock === "1";

  if (useMock) {
    return (
      <SettingsForm
        notificationSettings={MOCK_NOTIFICATION_SETTINGS}
        isMock
      />
    );
  }

  const data = await getSettingsData();

  if (!data) {
    redirect("/student/login");
  }

  return <SettingsForm notificationSettings={data.notificationSettings} />;
}
