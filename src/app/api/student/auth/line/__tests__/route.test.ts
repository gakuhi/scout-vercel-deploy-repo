import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "crypto";
import type { NextRequest } from "next/server";

const HMAC_SECRET = "test-secret-smartes";
const ALLOWED_CALLBACK = "https://smartes.example.com";

function stateKey(): string {
  return randomBytes(32).toString("hex");
}

function makeGet(searchParams: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/student/auth/line");
  for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);
  return new Request(url.toString(), { method: "GET" }) as unknown as NextRequest;
}

function makePost(body: Record<string, string>): NextRequest {
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) form.set(k, v);
  return new Request("http://localhost/api/student/auth/line", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  }) as unknown as NextRequest;
}

describe("/api/student/auth/line", () => {
  beforeEach(() => {
    vi.stubEnv("SCOUT_STATE_ENCRYPTION_KEY", stateKey());
    vi.stubEnv("SCOUT_HMAC_SECRET_SMARTES", HMAC_SECRET);
    vi.stubEnv("ALLOWED_CALLBACK_SMARTES", ALLOWED_CALLBACK);
    vi.stubEnv("LINE_LOGIN_CHANNEL_ID", "test-channel-id");
    vi.stubEnv("LINE_LOGIN_CHANNEL_SECRET", "test-channel-secret");
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://scout.example.com");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("GET (直接ログイン)", () => {
    it("パラメータなしで LINE 認可 URL へ 302 リダイレクト + csrf cookie セット", async () => {
      const { GET } = await import("../route");
      const res = await GET(makeGet());

      expect(res.status).toBe(303); // PRG パターン (POST→GET 変換) のため 303 を明示
      const location = res.headers.get("location");
      expect(location).toContain("access.line.me/oauth2/v2.1/authorize");
      expect(location).toContain("state="); // state が付与される
      const setCookie = res.headers.get("set-cookie") ?? "";
      expect(setCookie).toContain("scout_csrf=");
    });

    it("source パラメータ付き GET は 405 で拒否（旧仕様の誤用検知）", async () => {
      const { GET } = await import("../route");
      const res = await GET(makeGet({ source: "smartes" }));
      expect(res.status).toBe(405);
    });
  });

  describe("POST (プロダクト連携)", () => {
    async function signedSignature(
      source: string,
      userId: string,
      email: string,
      callbackUrl: string,
    ): Promise<string> {
      const { generateHmacSignature } = await import("@/lib/line/hmac");
      return generateHmacSignature(source, userId, email, callbackUrl, HMAC_SECRET);
    }

    it("有効な body + 署名で 302 リダイレクト + csrf cookie セット", async () => {
      const body = {
        source: "smartes",
        source_user_id: "ext-001",
        email: "user@example.com",
        callback_url: `${ALLOWED_CALLBACK}/after`,
      };
      const signature = await signedSignature(
        body.source,
        body.source_user_id,
        body.email,
        body.callback_url,
      );

      const { POST } = await import("../route");
      const res = await POST(makePost({ ...body, signature }));

      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toContain("access.line.me");
      expect(res.headers.get("set-cookie") ?? "").toContain("scout_csrf=");
    });

    it("email 空文字でも 303 リダイレクト（プロダクトが email を持たないケース）", async () => {
      const body = {
        source: "smartes",
        source_user_id: "ext-002",
        email: "",
        callback_url: `${ALLOWED_CALLBACK}/after`,
      };
      const signature = await signedSignature(
        body.source,
        body.source_user_id,
        body.email,
        body.callback_url,
      );

      const { POST } = await import("../route");
      const res = await POST(makePost({ ...body, signature }));

      expect(res.status).toBe(303);
    });

    it("不正な HMAC で 403", async () => {
      const body = {
        source: "smartes",
        source_user_id: "ext-003",
        email: "user@example.com",
        callback_url: `${ALLOWED_CALLBACK}/after`,
        signature: "0".repeat(64), // 有効な hex だが HMAC としては不正
      };

      const { POST } = await import("../route");
      const res = await POST(makePost(body));
      expect(res.status).toBe(403);
    });

    it("必須フィールド欠如（source なし）で 400", async () => {
      const { POST } = await import("../route");
      const res = await POST(
        makePost({
          source_user_id: "ext-004",
          email: "user@example.com",
          callback_url: `${ALLOWED_CALLBACK}/after`,
          signature: "0".repeat(64),
        }),
      );
      expect(res.status).toBe(400);
    });

    it("callback_url が whitelist 外なら 400", async () => {
      const body = {
        source: "smartes",
        source_user_id: "ext-005",
        email: "user@example.com",
        callback_url: "https://attacker.com/phish",
      };
      const signature = await signedSignature(
        body.source,
        body.source_user_id,
        body.email,
        body.callback_url,
      );

      const { POST } = await import("../route");
      const res = await POST(makePost({ ...body, signature }));
      expect(res.status).toBe(400);
    });

    it("form でない body は 400", async () => {
      const req = new Request("http://localhost/api/student/auth/line", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "smartes" }),
      }) as unknown as NextRequest;

      const { POST } = await import("../route");
      const res = await POST(req);
      // formData() は JSON body に対して throw → catch して 400 を返す実装
      expect(res.status).toBe(400);
    });

    it("GET /api/student/auth/line (source 付き) は 405 + Allow: POST ヘッダ", async () => {
      const { GET } = await import("../route");
      const res = await GET(makeGet({ source: "smartes" }));
      expect(res.status).toBe(405);
      expect(res.headers.get("allow")).toBe("POST");
    });
  });
});
