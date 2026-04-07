import { NextResponse } from "next/server";
import { z } from "zod";
import { getResend } from "@/lib/resend/client";

const requestSchema = z.object({
  to: z.string().email("有効なメールアドレスを指定してください"),
});

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "テスト送信は本番環境では無効です" },
      { status: 403 },
    );
  }

  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: "Scout <onboarding@resend.dev>",
    to: parsed.data.to,
    subject: "【テスト】Scout メール送信テスト",
    html: "<p>このメールは Scout サービスからのテスト送信です。</p>",
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ data });
}
