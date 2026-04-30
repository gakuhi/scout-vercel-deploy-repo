/** 姓名を結合してフルネームを生成 */
export function buildFullName(
  lastName: string | null,
  firstName: string | null,
): string {
  return [lastName, firstName].filter(Boolean).join(" ") || "未設定";
}

/** 姓名の頭文字からイニシャルを生成 */
export function buildInitials(
  lastName: string | null,
  firstName: string | null,
): string {
  return (
    [lastName?.charAt(0), firstName?.charAt(0)].filter(Boolean).join("") || "?"
  );
}

/** 生年月日から年齢を計算 */
export function calcAge(birthdate: string, today?: Date): number {
  const birth = new Date(birthdate);
  const now = today ?? new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/** チェックボックスの FormData 値を boolean に変換 */
export function checkboxToBool(value: FormDataEntryValue | null): boolean {
  return value === "on";
}

/**
 * プロフィール作成が完了しているかを判定。
 * profileSchema の必須項目（任意項目 building / mbti_type_code / bio /
 * is_profile_public を除く）が全て埋まっているかで判定する。
 *
 * 同時登録などで students に外部データが部分反映されると一部カラム
 * （例: university）だけ埋まる状態が起き得るため、単一カラム判定では
 * 「実質未入力なのに dashboard にリダイレクト」が発生する。
 * 判定ロジックを 1 箇所に集約しておくことで、必須項目が増減した際も
 * ここだけ追従すれば済む。
 */
export type ProfileCompleteFields = {
  last_name: string | null;
  first_name: string | null;
  last_name_kana: string | null;
  first_name_kana: string | null;
  email: string | null;
  phone: string | null;
  birthdate: string | null;
  gender: string | null;
  university: string | null;
  faculty: string | null;
  department: string | null;
  academic_type: string | null;
  graduation_year: number | null;
  postal_code: string | null;
  prefecture: string | null;
  city: string | null;
  street: string | null;
};

/**
 * 必須項目とその日本語ラベル。
 * isProfileComplete / computeProfileCompletion の両方が参照する単一情報源。
 * 必須項目を増減する場合はここだけ更新する。
 */
const PROFILE_COMPLETION_FIELDS: ReadonlyArray<{
  key: keyof ProfileCompleteFields;
  label: string;
}> = [
  { key: "last_name", label: "姓" },
  { key: "first_name", label: "名" },
  { key: "last_name_kana", label: "姓（カナ）" },
  { key: "first_name_kana", label: "名（カナ）" },
  { key: "email", label: "メールアドレス" },
  { key: "phone", label: "電話番号" },
  { key: "birthdate", label: "生年月日" },
  { key: "gender", label: "性別" },
  { key: "university", label: "大学" },
  { key: "faculty", label: "学部" },
  { key: "department", label: "学科" },
  { key: "academic_type", label: "学籍区分" },
  { key: "graduation_year", label: "卒業年" },
  { key: "postal_code", label: "郵便番号" },
  { key: "prefecture", label: "都道府県" },
  { key: "city", label: "市区町村" },
  { key: "street", label: "町名・番地" },
];

export function isProfileComplete(
  student: ProfileCompleteFields | null | undefined,
): boolean {
  if (!student) return false;
  return PROFILE_COMPLETION_FIELDS.every((f) => Boolean(student[f.key]));
}

/**
 * ホームのプロフィール完成度バナーで使う集計。
 * 必須項目の埋まり具合をパーセンテージ化し、未入力項目の日本語ラベル先頭 3 件を返す。
 * 100% 達成時は null（バナー非表示）。
 */
export function computeProfileCompletion(
  student: ProfileCompleteFields | null | undefined,
): { percent: number; missingFields: string[] } | null {
  if (!student) {
    return {
      percent: 0,
      missingFields: PROFILE_COMPLETION_FIELDS.slice(0, 3).map((f) => f.label),
    };
  }
  const total = PROFILE_COMPLETION_FIELDS.length;
  const missing = PROFILE_COMPLETION_FIELDS.filter(
    (f) => !student[f.key],
  ).map((f) => f.label);
  const filled = total - missing.length;
  const percent = Math.round((filled / total) * 100);
  if (percent >= 100) return null;
  return { percent, missingFields: missing.slice(0, 3) };
}
