import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// SDK 自体は重い・ネットワーク前提なので、コンストラクタ呼び出しを差し替えて
// オプションが意図通り渡っているかだけを検証する。
const mockConstructor = vi.fn();
vi.mock("@google/genai", () => ({
  // `new GoogleGenAI(opts)` で呼ばれるため、アロー関数ではなく function キーワードで定義する必要がある
  GoogleGenAI: function MockGoogleGenAI(opts: unknown) {
    mockConstructor(opts);
    return { __mock: true };
  },
}));

const originalKey = process.env.GEMINI_API_KEY;

beforeEach(() => {
  mockConstructor.mockClear();
  // クライアントはモジュール内でメモ化されているので毎回リセットする
  vi.resetModules();
  process.env.GEMINI_API_KEY = "test-key";
});

afterEach(() => {
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
});

describe("getGemini", () => {
  it("GEMINI_API_KEY が無いとエラー", async () => {
    delete process.env.GEMINI_API_KEY;
    const { getGemini } = await import("@/lib/gemini/client");
    expect(() => getGemini()).toThrow(/GEMINI_API_KEY/);
  });

  it("timeout と retryOptions.attempts を httpOptions 経由で SDK に渡す", async () => {
    const { getGemini, GEMINI_CLIENT_CONFIG } = await import("@/lib/gemini/client");
    getGemini();

    expect(mockConstructor).toHaveBeenCalledOnce();
    const opts = mockConstructor.mock.calls[0][0] as {
      apiKey: string;
      httpOptions?: {
        timeout?: number;
        retryOptions?: { attempts?: number };
      };
    };
    expect(opts.apiKey).toBe("test-key");
    expect(opts.httpOptions?.timeout).toBe(GEMINI_CLIENT_CONFIG.timeoutMs);
    expect(opts.httpOptions?.retryOptions?.attempts).toBe(
      GEMINI_CLIENT_CONFIG.retryAttempts,
    );
  });

  it("レート制限・5xx のリトライ総試行回数が Anthropic 側 (1 初回 + 3 リトライ) と揃っている", async () => {
    const { GEMINI_CLIENT_CONFIG } = await import("@/lib/gemini/client");
    // attempts は初回呼び出しを含むため、Anthropic の maxRetries=3 と揃えるには 4 が必要。
    expect(GEMINI_CLIENT_CONFIG.retryAttempts).toBeGreaterThanOrEqual(4);
  });

  it("単発リクエストのタイムアウトが route の maxDuration=300s に収まる", async () => {
    const { GEMINI_CLIENT_CONFIG } = await import("@/lib/gemini/client");
    // Anthropic 側と同じ閾値で揃え、リトライ連鎖が maxDuration を食い潰さないことを担保する。
    expect(GEMINI_CLIENT_CONFIG.timeoutMs).toBeLessThan(120_000);
  });

  it("二回目の getGemini はインスタンスをキャッシュして再生成しない", async () => {
    const { getGemini } = await import("@/lib/gemini/client");
    getGemini();
    getGemini();
    expect(mockConstructor).toHaveBeenCalledOnce();
  });
});
