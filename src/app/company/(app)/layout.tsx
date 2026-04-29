import { Sidebar } from "@/features/company/components/sidebar";
import {
  getSidebarUser,
  getUnreadNotificationCount,
} from "@/features/company/components/queries";

export default async function CompanyAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, unreadCount] = await Promise.all([
    getSidebarUser(),
    getUnreadNotificationCount(),
  ]);

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar user={user} unreadCount={unreadCount} />
      <main className="ml-64 pt-10 px-10 pb-10 min-h-screen">{children}</main>
    </div>
  );
}
