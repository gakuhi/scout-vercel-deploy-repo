"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

export type LoginActionState = {
  error?: string;
};

export async function loginAction(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return { error: "メールアドレスまたはパスワードが正しくありません" };
  }

  const role = (data.user.app_metadata?.role ?? null) as string | null;
  const isCompany =
    role === "company_owner" ||
    role === "company_admin" ||
    role === "company_member";

  if (!isCompany) {
    await supabase.auth.signOut();
    return { error: "このポータルは企業アカウント専用です" };
  }

  redirect("/company/dashboard");
}
