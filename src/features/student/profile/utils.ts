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

export function isProfileComplete(
  student: ProfileCompleteFields | null | undefined,
): boolean {
  if (!student) return false;
  return Boolean(
    student.last_name &&
      student.first_name &&
      student.last_name_kana &&
      student.first_name_kana &&
      student.email &&
      student.phone &&
      student.birthdate &&
      student.gender &&
      student.university &&
      student.faculty &&
      student.department &&
      student.academic_type &&
      student.graduation_year &&
      student.postal_code &&
      student.prefecture &&
      student.city &&
      student.street,
  );
}
