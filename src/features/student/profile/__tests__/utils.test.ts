import { describe, it, expect } from "vitest";
import {
  buildFullName,
  buildInitials,
  calcAge,
  checkboxToBool,
  isProfileComplete,
  type ProfileCompleteFields,
} from "../utils";

function completeStudent(): ProfileCompleteFields {
  return {
    last_name: "佐藤",
    first_name: "健太",
    last_name_kana: "サトウ",
    first_name_kana: "ケンタ",
    email: "kenta@example.com",
    phone: "09012345678",
    birthdate: "2003-01-15",
    gender: "male",
    university: "東京大学",
    faculty: "工学部",
    department: "情報工学科",
    academic_type: "science",
    graduation_year: 2027,
    postal_code: "1130033",
    prefecture: "東京都",
    city: "文京区",
    street: "本郷7-3-1",
  };
}

// ─── buildFullName ───

describe("buildFullName", () => {
  it("姓と名を結合する", () => {
    expect(buildFullName("佐藤", "健太")).toBe("佐藤 健太");
  });

  it("姓のみの場合は姓だけ返す", () => {
    expect(buildFullName("佐藤", null)).toBe("佐藤");
  });

  it("名のみの場合は名だけ返す", () => {
    expect(buildFullName(null, "健太")).toBe("健太");
  });

  it("両方 null の場合は「未設定」を返す", () => {
    expect(buildFullName(null, null)).toBe("未設定");
  });

  it("両方空文字の場合は「未設定」を返す", () => {
    expect(buildFullName("", "")).toBe("未設定");
  });
});

// ─── buildInitials ───

describe("buildInitials", () => {
  it("姓名の頭文字を結合する", () => {
    expect(buildInitials("佐藤", "健太")).toBe("佐健");
  });

  it("姓のみの場合は姓の頭文字を返す", () => {
    expect(buildInitials("佐藤", null)).toBe("佐");
  });

  it("名のみの場合は名の頭文字を返す", () => {
    expect(buildInitials(null, "健太")).toBe("健");
  });

  it("両方 null の場合は「?」を返す", () => {
    expect(buildInitials(null, null)).toBe("?");
  });
});

// ─── calcAge ───

describe("calcAge", () => {
  const today = new Date("2026-04-16");

  it("誕生日が過ぎている場合の年齢を正しく計算する", () => {
    expect(calcAge("2003-01-15", today)).toBe(23);
  });

  it("誕生日がまだ来ていない場合は1歳少なく返す", () => {
    expect(calcAge("2003-12-25", today)).toBe(22);
  });

  it("当日が誕生日の場合はその年齢を返す", () => {
    expect(calcAge("2003-04-16", today)).toBe(23);
  });

  it("誕生日の前日は1歳少ない", () => {
    expect(calcAge("2003-04-17", today)).toBe(22);
  });
});

// ─── checkboxToBool ───

describe("checkboxToBool", () => {
  it('"on" を true に変換する', () => {
    expect(checkboxToBool("on")).toBe(true);
  });

  it("null を false に変換する（未チェック時）", () => {
    expect(checkboxToBool(null)).toBe(false);
  });

  it('"off" を false に変換する', () => {
    expect(checkboxToBool("off")).toBe(false);
  });

  it("空文字を false に変換する", () => {
    expect(checkboxToBool("")).toBe(false);
  });
});

// ─── isProfileComplete ───

describe("isProfileComplete", () => {
  it("null / undefined は未完了とみなす", () => {
    expect(isProfileComplete(null)).toBe(false);
    expect(isProfileComplete(undefined)).toBe(false);
  });

  it("全必須項目が埋まっていれば完了とみなす", () => {
    expect(isProfileComplete(completeStudent())).toBe(true);
  });

  it("university だけ埋まっていて他が空なら未完了（同時登録での部分反映ケース）", () => {
    const partial: ProfileCompleteFields = {
      ...completeStudent(),
      first_name: null,
      phone: null,
      birthdate: null,
    };
    expect(isProfileComplete(partial)).toBe(false);

    const onlyUniversity: ProfileCompleteFields = {
      last_name: null,
      first_name: null,
      last_name_kana: null,
      first_name_kana: null,
      email: null,
      phone: null,
      birthdate: null,
      gender: null,
      university: "東京大学",
      faculty: null,
      department: null,
      academic_type: null,
      graduation_year: null,
      postal_code: null,
      prefecture: null,
      city: null,
      street: null,
    };
    expect(isProfileComplete(onlyUniversity)).toBe(false);
  });

  it("必須項目が 1 つでも null / 空文字なら未完了", () => {
    const requiredKeys: (keyof ProfileCompleteFields)[] = [
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
      "academic_type",
      "graduation_year",
      "postal_code",
      "prefecture",
      "city",
      "street",
    ];
    for (const key of requiredKeys) {
      const broken = { ...completeStudent(), [key]: null } as ProfileCompleteFields;
      expect(isProfileComplete(broken), `${key} が null で false になること`).toBe(false);
    }
  });
});
