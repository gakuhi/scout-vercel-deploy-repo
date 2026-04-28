import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { ApplyDefaults } from "../components/apply-dialog";

/**
 * 申込フォームの初期値を、Auth ユーザー + students テーブルのプロフィールから組み立てる。
 *
 * - 氏名: students.last_name + first_name を優先。無ければ Auth の display_name → email ローカル部 の順でフォールバック。
 * - メール: Auth の email。
 * - 所属: students.university / faculty / department を組み合わせる（卒業年度は含めない）。
 *   いずれかが欠けている場合は `affiliation` を未設定のまま返し、
 *   {@link isApplyProfileComplete} が "未完了" と判定できるようにする。
 *
 * いずれもクエリ失敗時はその項目だけ空に倒す（フォーム側で読み取り専用表示する前提）。
 */
export async function loadApplyDefaults(
  supabase: SupabaseClient,
  user: User | null,
): Promise<ApplyDefaults> {
  const defaults: ApplyDefaults = {
    name: (user?.user_metadata?.display_name as string | undefined) ?? undefined,
    email: user?.email ?? undefined,
  };

  if (!user) return defaults;

  const { data: student } = await supabase
    .from("students")
    .select("last_name, first_name, university, faculty, department")
    .eq("id", user.id)
    .maybeSingle<{
      last_name: string | null;
      first_name: string | null;
      university: string | null;
      faculty: string | null;
      department: string | null;
    }>();

  if (!student) return defaults;

  const fullName = [student.last_name, student.first_name].filter(Boolean).join(" ");
  if (fullName) defaults.name = fullName;

  // 大学・学部・学科の **すべて** が揃っているときだけ affiliation を確定させる。
  // 部分的にしか入っていないなら未完了として扱い、申込ボタンをプロフィール
  // 編集画面への CTA に切り替える。
  const allAffiliationFilled =
    Boolean(student.university) &&
    Boolean(student.faculty) &&
    Boolean(student.department);
  if (allAffiliationFilled) {
    defaults.affiliation = [
      student.university,
      student.faculty,
      student.department,
    ].join(" ");
  }

  return defaults;
}

/**
 * 申込に必要なプロフィール項目（氏名・メール・所属）が揃っているか判定する。
 * 1 つでも欠けている場合、画面側は申込フォームを開かず
 * 「プロフィールを完成させる」CTA に切り替える。
 */
export function isApplyProfileComplete(defaults: ApplyDefaults): boolean {
  return Boolean(defaults.name && defaults.email && defaults.affiliation);
}
