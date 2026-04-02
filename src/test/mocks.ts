import { vi } from "vitest";

/**
 * Supabase クライアントのモックを生成する。
 * テスト内で from().select() 等の戻り値を自由に差し替えられる。
 *
 * 使い方:
 *   const { supabase, mockReturn } = createMockSupabaseClient();
 *   mockReturn({ data: [{ id: 1, name: "田中" }], error: null });
 *   const result = await supabase.from("students").select("*");
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createMockSupabaseClient(): any {
  const resultHolder = { data: null as unknown, error: null as unknown };

  const makeChain = (): Record<string, unknown> => {
    const chain: Record<string, unknown> = {};
    const methods = [
      "select",
      "insert",
      "update",
      "delete",
      "eq",
      "neq",
      "in",
      "order",
      "limit",
    ];
    for (const method of methods) {
      chain[method] = vi.fn(() => chain);
    }
    chain.single = vi.fn(() => Promise.resolve(resultHolder));
    chain.then = (resolve: (value: unknown) => void) => resolve(resultHolder);
    return chain;
  };

  const supabase = {
    from: vi.fn(() => makeChain()),
  };

  /** テストごとに戻り値を設定する */
  function mockReturn(result: { data: unknown; error: unknown }) {
    resultHolder.data = result.data;
    resultHolder.error = result.error;
  }

  return { supabase, mockReturn };
}
