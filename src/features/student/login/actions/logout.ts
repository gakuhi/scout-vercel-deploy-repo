"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AUTH_ROUTES } from "@/shared/constants/auth";

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect(AUTH_ROUTES.LOGIN);
}
