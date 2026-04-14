"use server";

import { cookies } from "next/headers";
import { generateLineAuthUrl } from "../lib/line";

/**
 * LINE OAuth フローを開始する。
 * state (CSRF) と nonce を生成し、Cookie に保存してから LINE 認証 URL を返す。
 */
export async function signInWithLine(): Promise<{ url: string }> {
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();

  const cookieStore = await cookies();
  cookieStore.set("line_oauth_state", JSON.stringify({ state, nonce }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 分
    path: "/",
  });

  const url = generateLineAuthUrl(state, nonce);
  return { url };
}
