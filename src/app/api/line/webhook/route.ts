import { type NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * LINE Messaging API Webhook Event の型定義（follow / unfollow のみ）
 */
interface LineWebhookEvent {
  type: string;
  source?: {
    type: string;
    userId?: string;
  };
  timestamp: number;
  replyToken?: string;
}

interface LineWebhookBody {
  destination: string;
  events: LineWebhookEvent[];
}

/**
 * X-Line-Signature の検証
 *
 * LINE Messaging API の仕様に従い、リクエストボディを
 * チャネルシークレットで HMAC-SHA256 → Base64 した値と比較する。
 */
function verifySignature(
  body: string,
  signature: string,
  channelSecret: string,
): boolean {
  const expected = createHmac("sha256", channelSecret)
    .update(body)
    .digest("base64");

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);

  if (sigBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(sigBuf, expectedBuf);
}

/**
 * POST /api/line/webhook
 *
 * LINE Messaging API の Webhook を受け取り、follow / unfollow イベントで
 * line_friendships テーブルを更新する。
 *
 * - 署名不正 → 401
 * - DB エラー等 → 200（LINE にリトライさせない）
 * - 未対応イベント → 200（無視）
 */
export async function POST(request: NextRequest) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    console.error("[LINE webhook] LINE_CHANNEL_SECRET is not set");
    return NextResponse.json({ error: "server configuration error" }, { status: 500 });
  }

  // 署名検証
  const signature = request.headers.get("x-line-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 401 });
  }

  const rawBody = await request.text();

  if (!verifySignature(rawBody, signature, channelSecret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  // ボディのパース
  let body: LineWebhookBody;
  try {
    body = JSON.parse(rawBody) as LineWebhookBody;
  } catch {
    console.error("[LINE webhook] invalid JSON body");
    return NextResponse.json({ status: "ok" });
  }

  const admin = createAdminClient();

  for (const event of body.events) {
    if (event.type !== "follow" && event.type !== "unfollow") {
      continue;
    }

    const lineUid = event.source?.userId;
    if (!lineUid) {
      console.warn("[LINE webhook] event missing source.userId", event.type);
      continue;
    }

    // students.line_uid で突合
    const { data: student } = await admin
      .from("students")
      .select("id")
      .eq("line_uid", lineUid)
      .maybeSingle();

    if (!student) {
      console.warn(
        "[LINE webhook] no student found for line_uid",
        lineUid.slice(0, 8) + "...",
      );
      continue;
    }

    if (event.type === "follow") {
      const { error } = await admin.from("line_friendships").upsert(
        {
          student_id: student.id,
          line_uid: lineUid,
          is_friend: true,
          followed_at: new Date().toISOString(),
          unfollowed_at: null,
        },
        { onConflict: "student_id" },
      );

      if (error) {
        console.error("[LINE webhook] follow upsert failed", error.message);
      }
    } else {
      // unfollow
      const { error } = await admin
        .from("line_friendships")
        .update({
          is_friend: false,
          unfollowed_at: new Date().toISOString(),
        })
        .eq("student_id", student.id);

      if (error) {
        console.error("[LINE webhook] unfollow update failed", error.message);
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}
