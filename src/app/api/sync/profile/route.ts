import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { runBatch, updateProfile } from "@/lib/sync/profile";
import { requireCronAuth } from "@/lib/sync/shared";

// LLM 呼び出しは 1 件数十秒・バッチで更に積み上がるため、Vercel のデフォルトタイムアウトでは不足
export const maxDuration = 300;

// 内部 API のため、UUID 形式は DB 側で検証する（テスト UUID も受け入れるよう緩める）
const requestSchema = z
  .object({
    studentId: z.string().min(1).optional(),
    batch: z.boolean().optional(),
    force: z.boolean().optional(),
  })
  .refine((d) => d.studentId || d.batch, {
    message: "studentId または batch のいずれかを指定してください",
  });

export async function POST(request: Request) {
  // middleware が /api/sync/ を public prefix にしているため、認証はこのルートが担保する。
  const authError = requireCronAuth(request.headers);
  if (authError) return authError;

  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    if (parsed.data.batch) {
      const stats = await runBatch();
      return NextResponse.json({ data: stats });
    }
    const result = await updateProfile(parsed.data.studentId!, { force: parsed.data.force });
    return NextResponse.json({
      data: {
        status: result.status,
        profile: result.status === "updated" ? result.profile : null,
      },
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Claude API のレート制限に達しました。しばらく待ってから再試行してください" },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API エラー: ${error.message}` },
        { status: error.status ?? 502 },
      );
    }
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
