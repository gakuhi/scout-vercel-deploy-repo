import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import type { SidebarUser } from "./sidebar";

export async function getSidebarUser(): Promise<SidebarUser | undefined> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return undefined;

  const { data } = await supabase
    .from("company_members")
    .select("last_name, first_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return undefined;

  return {
    name:
      [data.last_name, data.first_name].filter(Boolean).join(" ") ||
      user.email ||
      "ユーザー",
    role: data.role ?? "member",
  };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return count ?? 0;
}
