import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationSettingsView } from "@/features/company/app/notifications/components/notification-settings-view";
import { saveNotificationSettingsAction } from "@/features/company/app/notifications/actions";
import {
  getCompanyMembership,
  getNotificationSettings,
} from "@/features/company/app/notifications/queries";

export const metadata = {
  title: "通知設定 | ScoutLink",
};

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/company/login");

  const membership = await getCompanyMembership(user.id);
  if (!membership) redirect("/company/login");

  const settings = await getNotificationSettings(user.id);

  return (
    <NotificationSettingsView
      settings={settings}
      action={saveNotificationSettingsAction}
    />
  );
}
