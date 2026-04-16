"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
});

export type ForgotPasswordState = {
  error?: string;
  success?: boolean;
};

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力を確認してください" };
  }

  const supabase = await createClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${siteUrl}/company/reset-password` },
  );

  if (error) {
    return { error: "リセットメールの送信に失敗しました。時間を置いて再度お試しください。" };
  }

  return { success: true };
}
