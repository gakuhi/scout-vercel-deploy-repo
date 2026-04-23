import { Sidebar } from "@/features/company/components/sidebar";
import { Topbar } from "@/features/company/components/topbar";
import { getSidebarUser } from "@/features/company/components/queries";

export default async function CompanyAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSidebarUser();

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar user={user} />
      <Topbar />
      <main className="ml-64 pt-24 px-10 pb-10 min-h-screen">{children}</main>
    </div>
  );
}
