import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// SDK 自体は重い・ネットワーク前提なので、コンストラクタ呼び出しを差し替えて
// オプションが意図通り渡っているかだけを検証する。
const mockConstructor = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  // `new Anthropic(opts)` で呼ばれるため、アロー関数ではなく function キーワードで定義する必要がある
  default: function MockAnthropic(opts: unknown) {
    mockConstructor(opts);
    return { __mock: true };
  },
}));

const originalKey = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  mockConstructor.mockClear();
  // クライアントはモジュール内でメモ化されているので毎回リセットする
  vi.resetModules();
  process.env.ANTHROPIC_API_KEY = "test-key";
});

afterEach(() => {
  if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = originalKey;
});

describe("getAnthropic", () => {
  it("ANTHROPIC_API_KEY が無いとエラー", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { getAnthropic } = await import("@/lib/anthropic/client");
    expect(() => getAnthropic()).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("timeout と maxRetries を明示的に SDK に渡す", async () => {
    const { getAnthropic, ANTHROPIC_CLIENT_CONFIG } = await import("@/lib/anthropic/client");
    getAnthropic();

    expect(mockConstructor).toHaveBeenCalledOnce();
    const opts = mockConstructor.mock.calls[0][0] as {
      apiKey: string;
      timeout: number;
      maxRetries: number;
    };
    expect(opts.apiKey).toBe("test-key");
    expect(opts.timeout).toBe(ANTHROPIC_CLIENT_CONFIG.timeoutMs);
    expect(opts.maxRetries).toBe(ANTHROPIC_CLIENT_CONFIG.maxRetries);
  });

  it("レート制限・5xx のリトライがデフォルトより多く確保されている", async () => {
    const { ANTHROPIC_CLIENT_CONFIG } = await import("@/lib/anthropic/client");
    // SDK のデフォルトは 2。429 が瞬間的にバーストするケースを 1 回多めに吸収する。
    expect(ANTHROPIC_CLIENT_CONFIG.maxRetries).toBeGreaterThanOrEqual(3);
  });

  it("単発リクエストのタイムアウトが route の maxDuration=300s に収まる", async () => {
    const { ANTHROPIC_CLIENT_CONFIG } = await import("@/lib/anthropic/client");
    // タイムアウト + 最悪リトライ間隔 (0.5+1+2 ≒ 3.5s) × maxRetries 倍より十分小さい必要がある
    expect(ANTHROPIC_CLIENT_CONFIG.timeoutMs).toBeLessThan(120_000);
  });

  it("二回目の getAnthropic はインスタンスをキャッシュして再生成しない", async () => {
    const { getAnthropic } = await import("@/lib/anthropic/client");
    getAnthropic();
    getAnthropic();
    expect(mockConstructor).toHaveBeenCalledOnce();
  });
});
