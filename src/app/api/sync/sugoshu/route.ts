import { NextRequest, NextResponse } from "next/server";
import { syncAllConsented, syncUser } from "@/lib/sync/sugoshu";
import { isValidCronRequest } from "@/lib/sync/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel Pro の関数実行時間制限を引き上げる（Bubble rate limit 込みで長くなる想定）
export const maxDuration = 300;

/**
 * POST /api/sync/sugoshu
 *
 * - ボディなし（または `{}`）: 日次 Cron として、同意済み全ユーザーを同期
 * - ボディ `{ "external_user_id": "..." }`: オンデマンド同期（1 ユーザー分）
 *
 * 認証: `Authorization: Bearer <CRON_SECRET>`
 *   Cron 呼び出しもオンデマンド呼び出し（スカウト内部サーバーコードから）も同じ Secret を使う。
 *   内部呼び出しを Route Handler 経由にせず `syncUser` を直接 import する場合は認証不要。
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
    // 全員成功していれば 200、部分失敗含めば 207
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
