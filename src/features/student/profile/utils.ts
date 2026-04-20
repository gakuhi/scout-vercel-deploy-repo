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
