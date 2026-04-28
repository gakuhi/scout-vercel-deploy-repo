import { describe, expect, it } from "vitest";
import { isApplyProfileComplete } from "../lib/apply-defaults";

describe("isApplyProfileComplete", () => {
  it("name / email / affiliation 全部揃っていれば true", () => {
    expect(
      isApplyProfileComplete({
        name: "山田 太郎",
        email: "yamada@example.com",
        affiliation: "東京大学 工学部 機械工学科",
      }),
    ).toBe(true);
  });

  it("name が欠けていれば false", () => {
    expect(
      isApplyProfileComplete({
        email: "yamada@example.com",
        affiliation: "東京大学 工学部 機械工学科",
      }),
    ).toBe(false);
  });

  it("email が欠けていれば false", () => {
    expect(
      isApplyProfileComplete({
        name: "山田 太郎",
        affiliation: "東京大学 工学部 機械工学科",
      }),
    ).toBe(false);
  });

  it("affiliation が欠けていれば false（loadApplyDefaults 側で大学/学部/学科のいずれか欠けたら未設定にする）", () => {
    expect(
      isApplyProfileComplete({
        name: "山田 太郎",
        email: "yamada@example.com",
      }),
    ).toBe(false);
  });

  it("空文字列は欠けと同じ扱い (false)", () => {
    expect(
      isApplyProfileComplete({
        name: "",
        email: "yamada@example.com",
        affiliation: "東京大学 工学部 機械工学科",
      }),
    ).toBe(false);
  });
});
