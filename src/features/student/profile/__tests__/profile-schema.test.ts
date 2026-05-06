import { describe, it, expect } from "vitest";
import { profileSchema } from "../schema";

/** 全項目が有効なデータ */
function validData() {
  return {
    last_name: "佐藤",
    first_name: "健太",
    last_name_kana: "サトウ",
    first_name_kana: "ケンタ",
    email: "k.sato@example.com",
    phone: "09012345678",
    birthdate: "2003-05-15",
    gender: "male",
    university: "慶應義塾大学",
    faculty: "経済学部",
    department: "経済学科",
    academic_type: "liberal_arts" as const,
    graduation_year: 2027,
    postal_code: "1080073",
    prefecture: "東京都",
    city: "港区三田",
    street: "2-15-45",
    bio: "自己紹介です",
  };
}

// ─── 正常系 ───

describe("profileSchema 正常系", () => {
  it("全項目が有効なデータを受け入れる", () => {
    expect(profileSchema.safeParse(validData()).success).toBe(true);
  });

  it("任意項目が省略されていても受け入れる", () => {
    const data = {
      ...validData(),
      mbti_type_code: undefined,
      profile_image_url: undefined,
      is_profile_public: undefined,
    };
    expect(profileSchema.safeParse(data).success).toBe(true);
  });

  it("graduation_year を文字列で渡しても数値に変換される", () => {
    const data = { ...validData(), graduation_year: "2027" };
    const result = profileSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.graduation_year).toBe(2027);
    }
  });
});

// ─── メールアドレス ───

describe("profileSchema メールアドレス", () => {
  it("有効なメールアドレスを受け入れる", () => {
    const data = { ...validData(), email: "user@example.com" };
    expect(profileSchema.safeParse(data).success).toBe(true);
  });

  it("無効なメールアドレスを拒否する", () => {
    const data = { ...validData(), email: "not-an-email" };
    expect(profileSchema.safeParse(data).success).toBe(false);
  });

  it("空のメールアドレスを拒否する", () => {
    const data = { ...validData(), email: "" };
    expect(profileSchema.safeParse(data).success).toBe(false);
  });
});

// ─── 必須項目の未入力チェック ───

describe("profileSchema 必須項目", () => {
  const requiredFields = [
    "last_name",
    "first_name",
    "last_name_kana",
    "first_name_kana",
    "email",
    "phone",
    "birthdate",
    "gender",
    "university",
    "faculty",
    "department",
    "postal_code",
    "prefecture",
    "city",
    "street",
  ] as const;

  for (const field of requiredFields) {
    it(`${field} が空文字の場合は拒否する`, () => {
      const data = { ...validData(), [field]: "" };
      expect(profileSchema.safeParse(data).success).toBe(false);
    });
  }
});

// ─── academic_type enum ───

describe("profileSchema 文理区分", () => {
  it.each(["liberal_arts", "science", "other"] as const)(
    "%s を受け入れる",
    (value) => {
      const data = { ...validData(), academic_type: value };
      expect(profileSchema.safeParse(data).success).toBe(true);
    },
  );

  it("不正な値を拒否する", () => {
    const data = { ...validData(), academic_type: "arts" };
    expect(profileSchema.safeParse(data).success).toBe(false);
  });
});

// ─── is_profile_public ───

describe("profileSchema 公開設定", () => {
  it("true を受け入れる", () => {
    const data = { ...validData(), is_profile_public: true };
    expect(profileSchema.safeParse(data).success).toBe(true);
  });

  it("false を受け入れる", () => {
    const data = { ...validData(), is_profile_public: false };
    expect(profileSchema.safeParse(data).success).toBe(true);
  });

  it("省略しても受け入れる", () => {
    const data = validData();
    expect(profileSchema.safeParse(data).success).toBe(true);
  });
});

// ─── birthdate range / format ───

describe("profileSchema 生年月日", () => {
  it("YYYY-MM-DD 以外の形式を拒否する", () => {
    const data = { ...validData(), birthdate: "2003/05/15" };
    const result = profileSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/YYYY-MM-DD/);
    }
  });

  it("実在しない日付（2 月 31 日）を拒否する", () => {
    const data = { ...validData(), birthdate: "2003-02-31" };
    expect(profileSchema.safeParse(data).success).toBe(false);
  });

  it("未来日付を拒否する", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const y = future.getFullYear();
    const data = { ...validData(), birthdate: `${y}-01-01` };
    expect(profileSchema.safeParse(data).success).toBe(false);
  });

  it("60 年以上前の日付を拒否する", () => {
    const tooOld = new Date();
    tooOld.setFullYear(tooOld.getFullYear() - 70);
    const y = tooOld.getFullYear();
    const data = { ...validData(), birthdate: `${y}-01-01` };
    expect(profileSchema.safeParse(data).success).toBe(false);
  });

  it("60 年以内の有効日付を受け入れる", () => {
    const data = { ...validData(), birthdate: "2003-05-15" };
    expect(profileSchema.safeParse(data).success).toBe(true);
  });
});
