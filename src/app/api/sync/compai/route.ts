import { NextRequest, NextResponse } from "next/server";
import { syncAllConsented, syncUser } from "@/lib/sync/compai";
import { isValidCronRequest } from "@/lib/sync/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/sync/compai
 *
 * - ボディなし（または `{}`）: 日次 Cron として、同意済み全ユーザーを同期
 * - ボディ `{ "external_user_id": "..." }`: オンデマンド同期（1 ユーザー分）
 *
 * 認証: `Authorization: Bearer <CRON_SECRET>`
 */
export async function POST(request: NextRequest) {
  if (!isValidCronRequest(request.headers)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  const body: unknown = contentLength > 0 ? await request.json() : {};

  const externalUserId = readExternalUserId(body);

  try {
    if (externalUserId) {
      const result = await syncUser(externalUserId);
      return NextResponse.json(result, { status: result.ok ? 200 : 207 });
    }
    const result = await syncAllConsented();
    const status =
      result.usersFailed === 0 && result.errors.length === 0 ? 200 : 207;
    return NextResponse.json(result, { status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

function readExternalUserId(body: unknown): string | null {
  if (
    body &&
    typeof body === "object" &&
    "external_user_id" in body &&
    typeof (body as { external_user_id: unknown }).external_user_id === "string"
  ) {
    return (body as { external_user_id: string }).external_user_id;
  }
  return null;
}
