import { describe, it, expect } from "vitest";
import {
  buildFullName,
  buildInitials,
  calcAge,
  checkboxToBool,
} from "../utils";

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
