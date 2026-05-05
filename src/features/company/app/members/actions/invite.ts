"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviteMemberSchema } from "@/features/company/app/members/schemas";
import {
  getCompanyIdForUser,
  getCurrentUserRole,
} from "@/features/company/app/members/queries";

export type InviteActionState = {
  error?: string;
  success?: boolean;
};

export async function inviteMemberAction(
  _prev: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  const parsed = inviteMemberSchema.safeParse({
    lastName: formData.get("lastName"),
    firstName: formData.get("firstName"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力を確認してください",
    };
  }

  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "ログインし直してください" };

  const [companyId, role] = await Promise.all([
    getCompanyIdForUser(user.id),
    getCurrentUserRole(user.id),
  ]);
  if (!companyId) return { error: "企業情報が見つかりません" };
  if (role !== "owner") return { error: "メンバー招待は企業オーナーのみ実行できます" };

  // 招待者・企業の情報を取得
  const [inviterData, companyData] = await Promise.all([
    supabase
      .from("company_members")
      .select("last_name, first_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .maybeSingle(),
  ]);
  const inviterName = [inviterData.data?.last_name, inviterData.data?.first_name]
    .filter(Boolean)
    .join(" ") || user.email || "管理者";
  const companyName = companyData.data?.name ?? "企業";
  const inviteeName = `${parsed.data.lastName} ${parsed.data.firstName}`;

  const admin = createAdminClient();

  // 事前チェックせず直接 invite。Supabase が email_exists を返したら
  // company_members を引き直して「自社BAN → 復帰」「他社 or 現役 → 重複エラー」に分岐
  const { data: inviteData, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
      data: {
        role: parsed.data.role,
        company_id: companyId,
        inviter_name: inviterName,
        company_name: companyName,
        invitee_name: inviteeName,
      },
    });

  // 既存メールアドレスの場合は company_members で自社メンバーか確認
  const isEmailExistsError =
    inviteError?.code === "email_exists" ||
    inviteError?.code === "user_already_exists";

  if (isEmailExistsError) {
    const { data: existingMember } = await admin
      .from("company_members")
      .select("id, company_id, is_active")
      .eq("email", parsed.data.email)
      .maybeSingle();

    // 他社所属 or company_members 未登録（孤立 auth）→ 重複扱い
    if (!existingMember || existingMember.company_id !== companyId) {
      return { error: "このメールアドレスは既に登録されています" };
    }

    // 自社の現役メンバー → 重複扱い
    if (existingMember.is_active !== false) {
      return { error: "このメールアドレスは既に登録されています" };
    }

    // 自社の BAN 済みメンバー → 復帰処理
    // ban 解除と app_metadata.role 更新を同時に行う（RLS は JWT の role を見るため、
    // company_members.role だけ更新すると権限が食い違う）
    const { error: unbanError } = await admin.auth.admin.updateUserById(
      existingMember.id,
      {
        ban_duration: "none",
        app_metadata: { role: `company_${parsed.data.role}` },
      },
    );
    if (unbanError) {
      return { error: `復帰処理に失敗しました: ${unbanError.message}` };
    }

    const { error: reactivateError } = await admin
      .from("company_members")
      .update({
        is_active: true,
        role: parsed.data.role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingMember.id)
      .eq("company_id", companyId);
    if (reactivateError) {
      return {
        error: `メンバー情報の更新に失敗しました: ${reactivateError.message}`,
      };
    }

    const { error: recoveryError } =
      await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000"}/company/reset-password`,
      });
    if (recoveryError) {
      return { error: `復帰メールの送信に失敗しました: ${recoveryError.message}` };
    }

    revalidatePath("/company/members");
    return { success: true };
  }

  if (inviteError || !inviteData.user) {
    return {
      error: `招待に失敗しました: ${inviteError?.message ?? "不明なエラー"}`,
    };
  }

  // app_metadata にロールを設定
  const { error: metadataError } = await admin.auth.admin.updateUserById(
    inviteData.user.id,
    {
      app_metadata: {
        role: `company_${parsed.data.role}`,
      },
    },
  );
  if (metadataError) {
    await admin.auth.admin.deleteUser(inviteData.user.id);
    return {
      error: `メンバー登録に失敗しました: ${metadataError.message}`,
    };
  }

  // company_members にレコード追加
  const { error: memberError } = await admin
    .from("company_members")
    .insert({
      id: inviteData.user.id,
      company_id: companyId,
      email: parsed.data.email,
      last_name: parsed.data.lastName,
      first_name: parsed.data.firstName,
      role: parsed.data.role,
      is_active: true,
    });

  if (memberError) {
    await admin.auth.admin.deleteUser(inviteData.user.id);
    return { error: `メンバー登録に失敗しました: ${memberError.message}` };
  }

  revalidatePath("/company/members");
  return { success: true };
}
