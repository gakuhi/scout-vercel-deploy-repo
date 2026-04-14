import { createAdminClient } from "@/lib/supabase/admin";
import type { LineIdTokenPayload } from "../types";

/**
 * LINE ユーザーを Supabase に作成または既存ユーザーを検索し、
 * セッション確立用の magic link トークンを生成する。
 *
 * @returns hashed_token — Supabase の verify endpoint に渡してセッションを確立する
 */
export async function createOrSignInLineUser(
  linePayload: LineIdTokenPayload,
  email: string,
): Promise<{ hashedToken: string; isNewUser: boolean }> {
  const admin = createAdminClient();
  let isNewUser = false;

  // 1. メールアドレスで既存ユーザーを検索
  const { data: existingUsers } = await admin.auth.admin.listUsers({
    perPage: 1,
  });

  // listUsers はフィルタをサポートしないため、メールで手動検索
  // パフォーマンスが問題になる場合は DB クエリに切り替える
  let existingUser = existingUsers?.users.find((u) => u.email === email);

  if (!existingUser) {
    // ページネーション対応: メールで直接検索を試みる
    // Supabase admin API v2 ではメールフィルタが使える場合がある
    const { data: allUsers } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });
    existingUser = allUsers?.users.find((u) => u.email === email);
  }

  if (existingUser) {
    // 既存ユーザーに LINE 情報を追加/更新
    await admin.auth.admin.updateUserById(existingUser.id, {
      user_metadata: {
        ...existingUser.user_metadata,
        line_user_id: linePayload.sub,
        display_name:
          linePayload.name ?? existingUser.user_metadata?.display_name,
        avatar_url:
          linePayload.picture ?? existingUser.user_metadata?.avatar_url,
      },
    });
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
        },
      });

    if (createError) {
      throw new Error(`ユーザー作成に失敗しました: ${createError.message}`);
    }

    existingUser = newUser.user;
    isNewUser = true;

    // students テーブルにレコードを作成（RLS バイパスのため admin client 使用）
    const { error: insertError } = await admin.from("students").insert({
      id: existingUser.id,
      email,
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
