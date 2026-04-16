import { NextResponse } from "next/server";
import { generateLineAuthUrl } from "@/features/auth/lib/line";

/**
 * GET /api/auth/line
 *
 * LINE Login OAuth フローを開始する。
 * state / nonce を生成して HttpOnly Cookie に保存し、LINE 認証画面へリダイレクトする。
 */
export async function GET() {
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();

  const url = generateLineAuthUrl(state, nonce);
  const response = NextResponse.redirect(url);

  response.cookies.set("line_oauth_state", JSON.stringify({ state, nonce }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
    sameSite: "lax",
  });

  return response;
}
