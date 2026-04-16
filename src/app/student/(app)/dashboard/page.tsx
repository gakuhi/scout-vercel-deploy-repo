import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "ダッシュボード | Scout",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">ダッシュボード</h2>
      <p className="mt-2 text-gray-600">
        ようこそ、{user?.user_metadata?.display_name ?? user?.email} さん
      </p>
    </div>
  );
}
