"use server";

import { revalidatePath } from "next/cache";
import { notify } from "@/features/notification";
import { getSignedUrls } from "@/lib/storage/signed-url";
import { createClient } from "@/lib/supabase/server";
import { formatSender, toDisplayStatus } from "./lib/display";
import type { ScoutItem } from "./schema";

export type ScoutActionState = {
  error?: string;
  success?: boolean;
};

type ScoutRow = {
  id: string;
  subject: string;
  message: string;
  sent_at: string;
  read_at: string | null;
  responded_at: string | null;
  expires_at: string | null;
  is_favorite: boolean;
  status: "sent" | "accepted" | "declined" | "expired";
  companies: {
    name: string;
    logo_url: string | null;
    industry: string | null;
    description: string | null;
    culture: string | null;
    employee_count_range: string | null;
    website_url: string | null;
  } | null;
  job_postings: {
    title: string;
    description: string | null;
    requirements: string | null;
    benefits: string | null;
    job_type: string | null;
    job_category: string | null;
    work_location: string | null;
    employment_type: string | null;
    salary_range: string | null;
    target_graduation_years: number[] | null;
    hero_image_path: string | null;
  } | null;
  company_members: {
    last_name: string | null;
    first_name: string | null;
  } | null;
};

export async function getScoutInbox(): Promise<ScoutItem[] | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("scouts")
    .select(
      `
      id, subject, message, sent_at, read_at, responded_at, expires_at, is_favorite, status,
      companies(name, logo_url, industry, description, culture, employee_count_range, website_url),
      job_postings(title, description, requirements, benefits, job_type, job_category, work_location, employment_type, salary_range, target_graduation_years, hero_image_path),
      company_members!scouts_sender_id_fkey(last_name, first_name)
    `,
    )
    .eq("student_id", user.id)
    .order("sent_at", { ascending: false });

  if (error) return [];

  const rows = (data ?? []) as unknown as ScoutRow[];

  // hero_image_path をまとめて署名 URL に解決（バケットは private）。
  // path が無いものは undefined のまま、解決失敗もログ出さず undefined にフォールバックする。
  const heroPaths = rows
    .map((r) => r.job_postings?.hero_image_path)
    .filter((p): p is string => typeof p === "string" && p.length > 0);
  const heroUrlByPath = new Map<string, string>();
  if (heroPaths.length > 0) {
    try {
      const signed = await getSignedUrls(supabase, "job-images", heroPaths);
      for (const s of signed) {
        if (s.path && !s.error) heroUrlByPath.set(s.path, s.signedUrl);
      }
    } catch {
      // 署名 URL 解決失敗は無視。UI 側で placeholder にフォールバック。
    }
  }

  return rows.map((r) => ({
    id: r.id,
    subject: r.subject,
    message: r.message,
    sentAt: r.sent_at,
    expiresAt: r.expires_at,
    status: toDisplayStatus(r),
    isFavorite: r.is_favorite,
    senderName: formatSender(r.company_members),
    company: {
      name: r.companies?.name ?? "不明な企業",
      logoUrl: r.companies?.logo_url ?? null,
      industry: r.companies?.industry ?? null,
      description: r.companies?.description ?? null,
      culture: r.companies?.culture ?? null,
      employeeCountRange: r.companies?.employee_count_range ?? null,
      websiteUrl: r.companies?.website_url ?? null,
    },
    job: {
      title: r.job_postings?.title ?? "",
      description: r.job_postings?.description ?? null,
      requirements: r.job_postings?.requirements ?? null,
      benefits: r.job_postings?.benefits ?? null,
      jobType: r.job_postings?.job_type ?? null,
      jobCategory: r.job_postings?.job_category ?? null,
      workLocation: r.job_postings?.work_location ?? null,
      employmentType: r.job_postings?.employment_type ?? null,
      salaryRange: r.job_postings?.salary_range ?? null,
      targetGraduationYears: r.job_postings?.target_graduation_years ?? [],
      heroImageUrl: r.job_postings?.hero_image_path
        ? heroUrlByPath.get(r.job_postings.hero_image_path) ?? null
        : null,
    },
  }));
}

/** お気に入りフラグをトグルする。UI 側で楽観的更新後に呼ぶ想定。 */
export async function toggleScoutFavorite(
  scoutId: string,
  next: boolean,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("scouts")
    .update({ is_favorite: next })
    .eq("id", scoutId)
    .eq("student_id", user.id);

  revalidatePath("/student/scout");
}

/** スカウトを既読にする。一覧ビューで対象を開いたタイミングで呼ぶ想定。 */
export async function markScoutAsRead(scoutId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("scouts")
    .update({ read_at: new Date().toISOString() })
    .eq("id", scoutId)
    .eq("student_id", user.id)
    .is("read_at", null);

  revalidatePath("/student/scout");
}

/**
 * 受信スカウトの status 遷移は `sent → accepted | declined` のみ許す。
 * RLS は本人縛りのみで status 遷移制約は無いため、サーバアクション側で
 * 「`status = 'sent'` かつ期限内」を必須条件にして UPDATE を実行する。
 * `.select()` で affected rows を取得し、0 件なら遷移不能としてエラー化。
 */
async function transitionScoutStatus(
  scoutId: string,
  next: "accepted" | "declined",
): Promise<ScoutActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証エラー" };

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("scouts")
    .update({ status: next, responded_at: nowIso })
    .eq("id", scoutId)
    .eq("student_id", user.id)
    .eq("status", "sent")
    // expires_at が NULL（期限なし）か、未来日時のもののみ通す。
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .select("id, sender_id, students(last_name, first_name)");

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`[transitionScoutStatus:${next}] supabase error:`, error);
    return {
      error: next === "accepted" ? "承諾に失敗しました" : "辞退に失敗しました",
    };
  }

  if (!data || data.length === 0) {
    // 既に他のステータスに遷移済み or 期限切れで弾かれた。
    return {
      error:
        "このスカウトは既に対応済みか期限切れのため、操作できません。一覧を更新してください。",
    };
  }

  // 送信元の企業メンバーへ通知。失敗しても遷移自体は成功扱いを維持する。
  const row = data[0] as unknown as {
    id: string;
    sender_id: string;
    students: { last_name: string | null; first_name: string | null } | null;
  };
  await notifyCompanyOfResponse(row, next).catch((e) => {
    // eslint-disable-next-line no-console
    console.error(`[transitionScoutStatus:${next}] notify error:`, e);
  });

  revalidatePath("/student/scout");
  return { success: true };
}

/** スカウト送信元の企業メンバーへ accept / decline の結果を通知する。 */
async function notifyCompanyOfResponse(
  scout: {
    id: string;
    sender_id: string;
    students: { last_name: string | null; first_name: string | null } | null;
  },
  next: "accepted" | "declined",
): Promise<void> {
  const studentName =
    [scout.students?.last_name, scout.students?.first_name]
      .filter(Boolean)
      .join(" ") || "学生";
  const verb = next === "accepted" ? "承諾" : "辞退";
  await notify({
    userId: scout.sender_id,
    recipientRole: "company_member",
    type: next === "accepted" ? "scout_accepted" : "scout_declined",
    title: `${studentName}さんがスカウトを${verb}しました`,
    referenceType: "scouts",
    referenceId: scout.id,
  });
}

export async function acceptScout(
  _prev: ScoutActionState,
  formData: FormData,
): Promise<ScoutActionState> {
  const scoutId = formData.get("scout_id");
  if (typeof scoutId !== "string") {
    return { error: "不正なリクエストです" };
  }
  return transitionScoutStatus(scoutId, "accepted");
}

export async function declineScout(
  _prev: ScoutActionState,
  formData: FormData,
): Promise<ScoutActionState> {
  const scoutId = formData.get("scout_id");
  if (typeof scoutId !== "string") {
    return { error: "不正なリクエストです" };
  }
  return transitionScoutStatus(scoutId, "declined");
}
