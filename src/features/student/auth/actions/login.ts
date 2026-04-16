"use server";

import { AUTH_ROUTES } from "@/shared/constants/auth";

/**
 * LINE OAuth フローを開始する。
 * API ルート /api/student/auth/line にリダイレクトさせるURLを返す。
 * state 生成・Cookie 保存は API ルート側で行う。
 */
export async function signInWithLine(): Promise<{ url: string }> {
  return { url: AUTH_ROUTES.LINE_AUTH };
}
