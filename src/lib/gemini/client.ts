import { GoogleGenAI } from "@google/genai";

// 単発リクエストあたりのタイムアウト。Anthropic クライアントと値を揃える
// （統合プロフィール生成は max_tokens=8192 で 30-50 秒、route の maxDuration=300s に収まる範囲）。
const REQUEST_TIMEOUT_MS = 90_000;

// 408/429/5xx 発生時に SDK が p-retry で自動リトライする総試行回数（初回呼び出しを含む）。
// Anthropic 側の maxRetries=3 と総試行回数を揃えるため 4 に設定する（1 初回 + 3 リトライ）。
//
// NOTE: Anthropic SDK と挙動が異なる点:
//   - Anthropic は `retry-after` / `retry-after-ms` ヘッダを尊重するが、
//     @google/genai SDK (^1.50) は尊重せず p-retry の exponential backoff のみ。
//     429 が短時間に重なるバーストでは Anthropic より早めに諦める可能性がある。
//   - 必要になれば呼び出し側で AbortSignal + 手動リトライに切り替えることもできる。
const RETRY_ATTEMPTS = 4;

let _client: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!_client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY が設定されていません");
    }
    _client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        timeout: REQUEST_TIMEOUT_MS,
        retryOptions: { attempts: RETRY_ATTEMPTS },
      },
    });
  }
  return _client;
}

// テスト用: 設定値を検証できるよう公開しておく
export const GEMINI_CLIENT_CONFIG = {
  timeoutMs: REQUEST_TIMEOUT_MS,
  retryAttempts: RETRY_ATTEMPTS,
} as const;
