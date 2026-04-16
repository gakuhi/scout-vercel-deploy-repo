import { createAdminClient } from "@/lib/supabase/admin";
import type { LineIdTokenPayload } from "../types";

/**
 * LINE user ID から決定的なプレースホルダー email を生成する。
 * LINE は email scope の承認が別途必要なため、プレースホルダーで Supabase Auth に登録する。
 */
export function lineEmail(lineUserId: string): string {
  return `line_${lineUserId}@line.scout.local`;
}

/**
 * LINE ユーザーを Supabase に作成または既存ユーザーを検索し、
 * セッション確立用の magic link トークンを生成する。
 *
 * @returns hashed_token — verifyOtp に渡してセッションを確立する
 */
export async function createOrSignInLineUser(
  linePayload: LineIdTokenPayload,
): Promise<{ hashedToken: string; isNewUser: boolean }> {
  const admin = createAdminClient();
  const email = linePayload.email ?? lineEmail(linePayload.sub);
  let isNewUser = false;

  // 1. students テーブルで既存ユーザーを検索（listUsers 全件走査を回避）
  const { data: existingStudent } = await admin
    .from("students")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingStudent) {
    // 既存ユーザーの LINE 情報を更新
    await admin.auth.admin.updateUserById(existingStudent.id, {
      user_metadata: {
        line_user_id: linePayload.sub,
        display_name: linePayload.name,
        avatar_url: linePayload.picture,
      },
    });

    // プロフィール画像を同期
    if (linePayload.picture) {
      await admin
        .from("students")
        .update({ profile_image_url: linePayload.picture })
        .eq("id", existingStudent.id);
    }
  } else {
    // 新規ユーザーを作成
    const { data: newUser, error: createError } =
      await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          line_user_id: linePayload.sub,
          display_name: linePayload.name,
          avatar_url: linePayload.picture,
        },
        app_metadata: {
          role: "student",
          provider: "line",
          providers: ["line"],
        },
      });

    if (createError || !newUser.user) {
      throw new Error(
        `ユーザー作成に失敗しました: ${createError?.message ?? "unknown"}`,
      );
    }

    isNewUser = true;

    // students テーブルにレコードを作成（RLS バイパスのため admin client 使用）
    const { error: insertError } = await admin.from("students").insert({
      id: newUser.user.id,
      email,
      last_name: linePayload.name ?? null,
      profile_image_url: linePayload.picture ?? null,
    });

    if (insertError) {
      throw new Error(
        `学生レコードの作成に失敗しました: ${insertError.message}`,
      );
    }
  }

  // 2. magic link を生成してセッション確立用トークンを取得
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

  if (linkError || !linkData) {
    throw new Error(
      `セッショントークンの生成に失敗しました: ${linkError?.message}`,
    );
  }

  return {
    hashedToken: linkData.properties.hashed_token,
    isNewUser,
  };
}
