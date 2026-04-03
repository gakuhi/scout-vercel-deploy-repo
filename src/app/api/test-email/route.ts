import { NextResponse } from "next/server";
import { getResend } from "@/lib/resend/client";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "テスト送信は本番環境では無効です" },
      { status: 403 },
    );
  }

  const { to } = await request.json();

  if (!to) {
    return NextResponse.json(
      { error: "送信先メールアドレス（to）を指定してください" },
      { status: 400 },
    );
  }

  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: "Scout <onboarding@resend.dev>",
    to,
    subject: "【テスト】Scout メール送信テスト",
    html: "<p>このメールは Scout サービスからのテスト送信です。</p>",
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ data });
}
