import { describe, expect, it, vi } from "vitest";

import { resolveEmailTarget } from "../resolve-email-target";

type SelectResult = {
  data: { email: string } | null;
  error: { message: string } | null;
};

function makeAdmin(companyMemberResult: SelectResult) {
  return {
    from(table: string) {
      if (table === "company_members") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve(companyMemberResult),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("resolveEmailTarget", () => {
  it("学生 role の場合は常に null（メール対象外）", async () => {
    // 学生分岐は admin にアクセスしないので空オブジェクトで十分
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const noopAdmin = {} as any;
    expect(
      await resolveEmailTarget(noopAdmin, "student-1", "student"),
    ).toBeNull();
  });

  it("企業担当者で行が存在し email がある場合は email を返す", async () => {
    const admin = makeAdmin({
      data: { email: "cm@example.com" },
      error: null,
    });

    expect(
      await resolveEmailTarget(admin, "cm-1", "company_member"),
    ).toBe("cm@example.com");
  });

  it("企業担当者で company_members に行が無い場合は null", async () => {
    const admin = makeAdmin({ data: null, error: null });

    expect(
      await resolveEmailTarget(admin, "cm-1", "company_member"),
    ).toBeNull();
  });

  it("企業担当者で email が空文字の場合は null", async () => {
    const admin = makeAdmin({ data: { email: "" }, error: null });

    expect(
      await resolveEmailTarget(admin, "cm-1", "company_member"),
    ).toBeNull();
  });

  it("DB エラーは例外として再送出する", async () => {
    const admin = makeAdmin({
      data: null,
      error: { message: "boom" },
    });
    const consoleErr = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await expect(
      resolveEmailTarget(admin, "cm-1", "company_member"),
    ).rejects.toThrow(/company_members の取得に失敗/);

    consoleErr.mockRestore();
  });
});
