import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForTokens, verifyIdToken } from "@/lib/line/token";
import { decryptState, type StatePayload } from "@/lib/line/state";
import { AUTH_ROUTES, STUDENT_ROUTES } from "@/shared/constants/auth";
import type { Database } from "@/shared/types/database";

/**
 * GET /api/student/auth/callback/line
 *
 * LINE Login の callback。state の origin で処理を分岐:
 *   - "direct": セッション確立 → ダッシュボードへ
 *   - それ以外: アカウント作成/紐付け → 元プロダクトへリダイレクトバック
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const errorParam = searchParams.get("error");

  // LINE認可がキャンセルされた場合
  if (errorParam) {
    return handleError(request, "LINE認証がキャンセルされました", stateParam);
  }

  if (!code || !stateParam) {
    return handleError(request, "missing_params", null);
  }

  try {
    // 1. state 復号・検証
    const state = decryptState(stateParam);

    // CSRF トークン検証
    const csrfCookie = request.cookies.get("scout_csrf")?.value;
    if (!csrfCookie || csrfCookie !== state.csrfToken) {
      return NextResponse.json(
        { error: "CSRF token mismatch" },
        { status: 403 },
      );
    }

    // 2. 認可コード → token 交換
    const { idToken } = await exchangeCodeForTokens(code);

    // 3. ID token 検証・ペイロード取得
    const lineUser = await verifyIdToken(idToken);

    // 4. origin で分岐
    if (state.origin === "direct") {
      return await handleDirectLogin(request, lineUser);
    } else {
      return await handleProductRegistration(request, lineUser, state);
    }
  } catch (err) {
    console.error("[LINE callback]", err);
    return handleError(
      request,
      err instanceof Error ? err.message : "認証処理中にエラーが発生しました",
      stateParam,
    );
  }
}

// ========================================
// 直接ログイン
// ========================================

/**
 * 直接ログインフロー
 * Supabase Auth でセッションを確立し、ダッシュボードへリダイレクト
 */
async function handleDirectLogin(
  request: NextRequest,
  lineUser: { sub: string; name?: string; picture?: string; email?: string },
) {
  const admin = createAdminClient();
  const email = lineUser.email ?? `${lineUser.sub}@line.scout.local`;

  // 既存ユーザーを検索（LINE UID → メアド の順）
  const existing = await findExistingStudent(admin, lineUser.sub, email);

  if (existing) {
    // LINE 情報を更新
    await admin.auth.admin.updateUserById(existing.id, {
      user_metadata: {
        line_uid: lineUser.sub,
        display_name: lineUser.name,
        avatar_url: lineUser.picture,
      },
    });

    if (lineUser.picture) {
      await admin
        .from("students")
        .update({ profile_image_url: lineUser.picture })
        .eq("id", existing.id);
    }
  } else {
    // 新規ユーザー作成
    const { data: newUser, error: createError } =
      await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          line_uid: lineUser.sub,
          display_name: lineUser.name,
          avatar_url: lineUser.picture,
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

    const { error: insertError } = await admin.from("students").insert({
      id: newUser.user.id,
      email,
      last_name: lineUser.name ?? null,
      line_uid: lineUser.sub,
      line_display_name: lineUser.name ?? null,
      profile_image_url: lineUser.picture ?? null,
    });

    if (insertError) {
      await admin.auth.admin.deleteUser(newUser.user.id);
      throw new Error(
        `学生レコードの作成に失敗しました: ${insertError.message}`,
      );
    }
  }

  // magic link でセッション確立
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

  // verifyOtp で Cookie ベースのセッション確立
  const redirectUrl = new URL(STUDENT_ROUTES.DASHBOARD, request.url);
  const response = NextResponse.redirect(redirectUrl);

  // CSRF cookie を削除
  response.cookies.delete("scout_csrf");

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error: otpError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (otpError) {
    throw new Error(`セッション確立に失敗しました: ${otpError.message}`);
  }

  return response;
}

// ========================================
// 同時登録 / 後から連携
// ========================================

/**
 * 外部プロダクトからの同時登録/連携フロー
 * アカウント作成or紐付け → 元プロダクトにリダイレクトバック
 */
async function handleProductRegistration(
  request: NextRequest,
  lineUser: { sub: string; name?: string; picture?: string; email?: string },
  state: StatePayload,
) {
  const admin = createAdminClient();
  const email = lineUser.email;

  // 既存アカウントチェック
  const existing = await findExistingStudent(admin, lineUser.sub, email);

  if (existing) {
    // 既存アカウントに LINE UID を紐付け（未紐付けの場合のみ）
    if (!existing.line_uid) {
      await admin
        .from("students")
        .update({
          line_uid: lineUser.sub,
          line_display_name: lineUser.name ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }
  } else {
    // 新規アカウント作成（LINE 情報のみ。プロダクトAPI連携は後回し）
    const studentEmail = email ?? `${lineUser.sub}@line.scout.local`;

    const { data: newUser, error: authError } =
      await admin.auth.admin.createUser({
        email: studentEmail,
        email_confirm: true,
        app_metadata: { role: "student" },
        user_metadata: {
          line_uid: lineUser.sub,
          line_display_name: lineUser.name,
          line_picture: lineUser.picture,
        },
      });

    if (authError || !newUser.user) {
      throw new Error(
        `Auth user creation failed: ${authError?.message ?? "unknown"}`,
      );
    }

    const { error: studentError } = await admin.from("students").insert({
      id: newUser.user.id,
      email: studentEmail,
      line_uid: lineUser.sub,
      line_display_name: lineUser.name ?? null,
      profile_image_url: lineUser.picture ?? null,
      registration_source: state.origin,
      data_consent_granted_at: new Date().toISOString(),
    });

    if (studentError) {
      await admin.auth.admin.deleteUser(newUser.user.id);
      throw new Error(
        `Student record creation failed: ${studentError.message}`,
      );
    }
  }

  // student_product_links にレコード作成（重複時は無視）
  const student =
    existing ??
    (await admin
      .from("students")
      .select("id, line_uid")
      .eq("line_uid", lineUser.sub)
      .maybeSingle()
      .then((r) => r.data));

  if (student && state.sourceUserId) {
    await admin.from("student_product_links").upsert(
      {
        student_id: student.id,
        product: state.origin,
        external_user_id: state.sourceUserId,
      },
      { onConflict: "student_id,product" },
    );

    // line_friendships にレコード作成
    await admin.from("line_friendships").upsert(
      {
        student_id: student.id,
        line_uid: lineUser.sub,
        is_friend: true,
        followed_at: new Date().toISOString(),
      },
      { onConflict: "student_id" },
    );
  }

  // 元プロダクトにリダイレクトバック
  const isNewRegistration = !existing;
  const redirectUrl = new URL(state.callbackUrl!);
  redirectUrl.searchParams.set("status", "success");
  redirectUrl.searchParams.set(
    isNewRegistration ? "scout_registered" : "scout_linked",
    "true",
  );

  const response = NextResponse.redirect(redirectUrl.toString());
  response.cookies.delete("scout_csrf");
  return response;
}

// ========================================
// ヘルパー
// ========================================

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

/**
 * LINE UID or メアドで既存の学生を検索
 */
async function findExistingStudent(
  supabase: SupabaseAdmin,
  lineUid: string,
  email: string | undefined,
) {
  const { data: byLineUid } = await supabase
    .from("students")
    .select("id, line_uid")
    .eq("line_uid", lineUid)
    .maybeSingle();

  if (byLineUid) return byLineUid;

  if (email) {
    const { data: byEmail } = await supabase
      .from("students")
      .select("id, line_uid")
      .eq("email", email)
      .maybeSingle();

    if (byEmail) return byEmail;
  }

  return null;
}

/**
 * エラー時の処理
 * state が復号できれば元プロダクトに戻す。できなければ学生ログインページへ
 */
function handleError(
  request: NextRequest,
  message: string,
  stateParam: string | null,
) {
  // state が復号できれば元プロダクトにエラーを返す
  if (stateParam) {
    try {
      const state = decryptState(stateParam);
      if (state.callbackUrl) {
        const redirectUrl = new URL(state.callbackUrl);
        redirectUrl.searchParams.set("status", "error");
        redirectUrl.searchParams.set("error_message", message);

        const response = NextResponse.redirect(redirectUrl.toString());
        response.cookies.delete("scout_csrf");
        return response;
      }
    } catch {
      // state 復号できない場合はフォールスルー
    }
  }

  // 直接ログインまたは state 復号失敗 → 学生ログインページへ
  const loginUrl = new URL(AUTH_ROUTES.STUDENT_LOGIN, request.url);
  loginUrl.searchParams.set("error", message);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete("scout_csrf");
  return response;
}
