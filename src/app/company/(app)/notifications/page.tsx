import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationListView } from "@/features/company/app/notifications/components/notification-list-view";
import {
  getCompanyMembership,
  listNotifications,
} from "@/features/company/app/notifications/queries";

export const metadata = {
  title: "通知 | ScoutLink",
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/company/login");

  const membership = await getCompanyMembership(user.id);
  if (!membership) redirect("/company/login");

  const notifications = await listNotifications(user.id);

  return <NotificationListView notifications={notifications} />;
}
