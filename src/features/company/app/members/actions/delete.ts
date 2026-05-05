"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCompanyIdForUser,
  getCurrentUserRole,
} from "@/features/company/app/members/queries";

export type DeleteMemberState = {
  error?: string;
  success?: boolean;
};

export async function deleteMemberAction(
  memberId: string,
): Promise<DeleteMemberState> {
  const user = await getAuthUser();
  if (!user) return { error: "ログインし直してください" };

  const [companyId, role] = await Promise.all([
    getCompanyIdForUser(user.id),
    getCurrentUserRole(user.id),
  ]);
  if (!companyId) return { error: "企業情報が見つかりません" };
  if (role !== "owner") return { error: "この操作は企業オーナーのみ実行できます" };

  if (memberId === user.id) {
    return { error: "自分自身を無効化することはできません" };
  }

  const admin = createAdminClient();
  const { error: banError } = await admin.auth.admin.updateUserById(memberId, {
    ban_duration: "876000h",
  });

  if (banError) {
    return { error: `メンバーの無効化に失敗しました: ${banError.message}` };
  }

  const { error: updateError } = await admin
    .from("company_members")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("company_id", companyId);

  if (updateError) {
    return {
      error:
        "メンバーのログイン拒否は適用されましたが、一覧の更新に失敗しました。もう一度無効化ボタンを押してください。",
    };
  }

  revalidatePath("/company/members");
  return { success: true };
}
