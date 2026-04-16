import { Sidebar } from "@/features/company/components/sidebar";
import { Topbar } from "@/features/company/components/topbar";

export default function CompanyAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <Topbar />
      <main className="ml-64 pt-16 p-10 min-h-screen">{children}</main>
    </div>
  );
}
