import { describe, it, expect, vi } from "vitest";
import { createMockSupabaseClient } from "@/test/mocks";

const mockCreateBrowserClient = vi.fn(() => ({ from: vi.fn() }));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: mockCreateBrowserClient,
}));

describe("createClient (browser)", () => {
  it("環境変数を使って Supabase ブラウザクライアントを生成する", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    const { createClient } = await import("@/lib/supabase/client");
    createClient();

    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
    );
  });
});

describe("createMockSupabaseClient", () => {
  it("モックの戻り値を設定してクエリ結果を検証できる", async () => {
    const { supabase, mockReturn } = createMockSupabaseClient();

    mockReturn({
      data: [{ id: 1, name: "田中太郎" }],
      error: null,
    });

    const result = await supabase.from("students").select("*").eq("id", 1);

    expect(result.data).toEqual([{ id: 1, name: "田中太郎" }]);
    expect(result.error).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith("students");
  });
});
