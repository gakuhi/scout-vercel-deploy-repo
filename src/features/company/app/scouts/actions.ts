"use server";

import { revalidatePath } from "next/cache";
import { notify } from "@/features/notification";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoutMessageSchema, MONTHLY_SCOUT_LIMIT } from "./schemas";
import {
  getCompanyMembership,
  getAlreadyScoutedStudentIds,
} from "./queries";

export type SendScoutState = {
  error?: string;
  success?: boolean;
  sentCount?: number;
  skippedCount?: number;
};

export async function sendScoutAction(
  _prev: SendScoutState,
  formData: FormData,
): Promise<SendScoutState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインし直してください" };

  const membership = await getCompanyMembership(user.id);
  if (!membership) return { error: "企業情報が見つかりません" };

  const studentIds = formData.getAll("studentIds") as string[];

  const parsed = scoutMessageSchema.safeParse({
    subject: formData.get("subject"),
    message: formData.get("message"),
    jobPostingId: formData.get("jobPostingId"),
    studentIds,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  // 重複チェック（アプリ層。DB側にもUNIQUE制約あり）
  const alreadyScouted = await getAlreadyScoutedStudentIds(
    membership.companyId,
    parsed.data.studentIds,
    parsed.data.jobPostingId,
  );
  const newStudentIds = parsed.data.studentIds.filter(
    (id) => !alreadyScouted.includes(id),
  );

  if (newStudentIds.length === 0) {
    return { error: "選択した学生には既にスカウトを送信済みです" };
  }

  // アトミックに上限チェック + カウント更新（DB側RPCで排他ロック）
  const admin = createAdminClient();
  const { data: rpcResult, error: rpcError } = await admin.rpc(
    "increment_scouts_sent",
    {
      p_company_id: membership.companyId,
      p_count: newStudentIds.length,
      p_limit: MONTHLY_SCOUT_LIMIT,
    },
  );

  if (rpcError) {
    console.error("sendScoutAction rpc error:", rpcError);
    return { error: "スカウトの送信に失敗しました" };
  }

  const rpc = rpcResult as { success: boolean; error?: string; remaining?: number };
  if (!rpc.success) {
    if (rpc.error === "limit_reached") {
      return { error: "今月のスカウト送信上限（30通）に達しています" };
    }
    if (rpc.error === "limit_exceeded") {
      return {
        error: `今月の残り送信可能数は${rpc.remaining}通です（${newStudentIds.length}人選択中）`,
      };
    }
    return { error: "スカウトの送信に失敗しました" };
  }

  // 一括INSERT（UNIQUE制約で重複はDB側でも防止）
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();
  const rows = newStudentIds.map((studentId) => ({
    company_id: membership.companyId,
    sender_id: user.id,
    student_id: studentId,
    job_posting_id: parsed.data.jobPostingId,
    subject: parsed.data.subject,
    message: parsed.data.message,
    status: "sent" as const,
    sent_at: nowIso,
    expires_at: expiresAt,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("scouts")
    .insert(rows)
    .select("id, student_id");

  if (insertError || !inserted) {
    console.error("sendScoutAction insert error:", insertError);
    return { error: "スカウトの送信に失敗しました" };
  }

  // 各学生へスカウト受信通知（失敗してもスカウト送信自体は成功扱い）
  for (const scout of inserted) {
    notify({
      userId: scout.student_id,
      recipientRole: "student",
      type: "scout_received",
      title: "企業からスカウトが届きました",
      body: `「${parsed.data.subject}」`,
      referenceType: "scouts",
      referenceId: scout.id,
    }).catch((e) => {
      console.error("[sendScoutAction] notify failed:", e);
    });
  }

  revalidatePath("/company/students");
  return {
    success: true,
    sentCount: newStudentIds.length,
    skippedCount: alreadyScouted.length,
  };
}
