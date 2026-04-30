import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardView } from "@/features/company/app/dashboard/components/dashboard-view";
import { getDashboardData } from "@/features/company/app/dashboard/queries";

export const metadata = {
  title: "採用ダッシュボード | ScoutLink",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/company/login");
  }

  const data = await getDashboardData(user.id);

  if (!data) {
    return (
      <div className="max-w-xl">
        <h2 className="text-2xl font-extrabold text-primary mb-2">
          企業情報が見つかりません
        </h2>
        <p className="text-sm text-on-surface-variant">
          ログイン中のアカウントに紐付く企業メンバー情報がありません。管理者に連絡してください。
        </p>
      </div>
    );
  }

  return <DashboardView data={data} />;
}
