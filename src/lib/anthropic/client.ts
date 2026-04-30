import Anthropic from "@anthropic-ai/sdk";

// 単発リクエストあたりのタイムアウト。
// 統合プロフィール生成は max_tokens=8192 でだいたい 30-50 秒。
// 70 秒 + ネットワーク余裕を見て 90 秒に設定する（SDK デフォルトの 10 分は長すぎ、
// route の maxDuration=300 を超えるリトライ連鎖を防ぐ）。
const REQUEST_TIMEOUT_MS = 90_000;

// 429 / 5xx 発生時に SDK が自動で行うリトライ回数。
// SDK のデフォルトは 2 だが、レート制限が短時間に重なる障害ケースも
// 1 段階多めに吸収したいので 3 とする（exponential backoff: 0.5s → 1s → 2s + jitter）。
// retry-after-ms ヘッダがあれば SDK がそれを優先するので、API が指示する待ち時間にも従う。
const MAX_RETRIES = 3;

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY が設定されていません");
    }
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: MAX_RETRIES,
    });
  }
  return _client;
}

// テスト用: 設定値を検証できるよう公開しておく
export const ANTHROPIC_CLIENT_CONFIG = {
  timeoutMs: REQUEST_TIMEOUT_MS,
  maxRetries: MAX_RETRIES,
} as const;
