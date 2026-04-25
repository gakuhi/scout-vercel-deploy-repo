import { z } from "zod";

/** 卒業予定年のレンジ。現在年 -1 から +8 年まで。 */
function graduationYearRange(): { min: number; max: number } {
  const now = new Date().getFullYear();
  return { min: now - 1, max: now + 8 };
}

const postalCodeRegex = /^\d{7}$/;
// 国内番号を想定。ハイフン/+/スペース/括弧を許容し、桁数 10〜15。
const phoneRegex = /^[\d\-+\s()]{10,15}$/;

export const profileSchema = z.object({
  last_name: z.string().min(1, "姓を入力してください"),
  first_name: z.string().min(1, "名を入力してください"),
  last_name_kana: z.string().min(1, "セイを入力してください"),
  first_name_kana: z.string().min(1, "メイを入力してください"),
  email: z.email("有効なメールアドレスを入力してください"),
  phone: z
    .string()
    .regex(phoneRegex, "電話番号を正しい形式で入力してください"),
  birthdate: z.string().min(1, "生年月日を入力してください"),
  gender: z.string().min(1, "性別を選択してください"),
  university: z.string().min(1, "大学を入力してください"),
  faculty: z.string().min(1, "学部を入力してください"),
  department: z.string().min(1, "学科を入力してください"),
  academic_type: z.enum(["liberal_arts", "science", "other"]),
  // 空文字を z.coerce.number() に渡すと 0 に変換され range エラーと見分けが付かないため、
  // preprocess で空値だけ undefined に落として「選択してください」を先に出す。
  graduation_year: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce
      .number({ error: "卒業予定年を選択してください" })
      .int()
      .refine((y) => {
        const { min, max } = graduationYearRange();
        return y >= min && y <= max;
      }, "卒業予定年が範囲外です"),
  ),
  postal_code: z
    .string()
    .regex(postalCodeRegex, "郵便番号はハイフンなしの 7 桁で入力してください"),
  prefecture: z.string().min(1, "都道府県を入力してください"),
  city: z.string().min(1, "市区町村を入力してください"),
  street: z.string().min(1, "町名・番地を入力してください"),
  building: z.string().optional(), // 建物名・部屋番号（任意）
  mbti_type_code: z.string().optional(),
  bio: z.string().optional(),
  is_profile_public: z.boolean().optional(),
});
