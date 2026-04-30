import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForTokens, verifyIdToken } from "@/lib/line/token";
import { decryptState, type StatePayload } from "@/lib/line/state";
import { AUTH_ROUTES, STUDENT_ROUTES } from "@/shared/constants/auth";
import { runSyncUser } from "@/lib/sync/shared";
import { productSourceSchema } from "@/features/auth/schemas";
import { isProfileComplete } from "@/features/student/profile/utils";
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

  let studentId: string;

  if (existing) {
    studentId = existing.id;
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

    studentId = newUser.user.id;

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

  // line_friendships に楽観的 UPSERT（bot_prompt=aggressive で friend-add がほぼ確実に走るため）。
  // webhook 先着で students 突合に失敗するケース（callback 完了前に follow webhook が到着）を
  // この行で救済する。実際の friend 状態は LINE Messaging API webhook が follow/unfollow で
  // 後追い更新するため、ここでの is_friend=true は初期値であり最終的な真実ではない。
  await admin.from("line_friendships").upsert(
    {
      student_id: studentId,
      line_uid: lineUser.sub,
      is_friend: true,
      followed_at: new Date().toISOString(),
    },
    { onConflict: "student_id" },
  );

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

  // プロフィール完成度に応じて遷移先を分岐。判定ロジックは utils 側に集約。
  const redirectPath = isProfileComplete(existing)
    ? STUDENT_ROUTES.DASHBOARD
    : STUDENT_ROUTES.PROFILE_CREATE;

  // verifyOtp で Cookie ベースのセッション確立
  const redirectUrl = new URL(redirectPath, request.url);
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
  // プロダクトから HMAC 署名付きで受け取った email を優先。LINE の email scope が
  // 付与されていないケース（LINE ビジネスアカウント等）でも突合キーが確保できる。
  // state.email は zod schema 上 "" を許容しているので、空文字は falsy fallback で
  // 落とす（`??` だと "" は nullish 扱いされず empty が下流に流れる）。
  const email = state.email || lineUser.email;

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
    // email が "" / undefined のいずれの場合も fallback に落ちるよう ?? ではなく || を使う
    const studentEmail = email || `${lineUser.sub}@line.scout.local`;

    const { data: newUser, error: authError } =
      await admin.auth.admin.createUser({
        email: studentEmail,
        email_confirm: true,
        app_metadata: {
          role: "student",
          // handleDirectLogin と揃えて provider/providers を明示する。これが無いと
          // Supabase が verifyOtp 時に provider を email として上書きし、JWT の
          // app_metadata から role が落ちる事象が発生していた。
          provider: "line",
          providers: ["line"],
        },
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

    // student_product_links に行があること = データ連携同意とみなす運用のため、
    // data_consent_granted_at が未設定なら link 作成と同時に now() を入れる。
    // 既に設定済みなら上書きしない（初回同意の時刻を保持）。
    await admin
      .from("students")
      .update({ data_consent_granted_at: new Date().toISOString() })
      .eq("id", student.id)
      .is("data_consent_granted_at", null);

    // line_friendships に楽観的 UPSERT（bot_prompt=aggressive で friend-add がほぼ確実に走るため）。
    // webhook 先着で students 突合に失敗するケース（callback 完了前に follow webhook が到着）を
    // この行で救済する。実際の friend 状態は LINE Messaging API webhook が follow/unfollow で
    // 後追い更新するため、ここでの is_friend=true は初期値であり最終的な真実ではない。
    await admin.from("line_friendships").upsert(
      {
        student_id: student.id,
        line_uid: lineUser.sub,
        is_friend: true,
        followed_at: new Date().toISOString(),
      },
      { onConflict: "student_id" },
    );

    // 同時登録直後に当該プロダクトのデータを同期（synced_{product}_* への UPSERT）。
    // sync 失敗は登録フロー全体を止めない（link は既に作成済み。日次 Cron でリトライされる）。
    // state.origin は string 型なので zod で ProductSource に narrow してから呼ぶ。
    const productParsed = productSourceSchema.safeParse(state.origin);
    if (productParsed.success) {
      try {
        const syncResult = await runSyncUser(
          productParsed.data,
          state.sourceUserId,
        );
        if (!syncResult.ok) {
          console.error(
            "[LINE callback] sync partial failure",
            productParsed.data,
            syncResult.errors,
          );
        }
      } catch (err) {
        console.error(
          "[LINE callback] sync threw",
          productParsed.data,
          err,
        );
      }
    }
  }

  // 元プロダクト（or scout 自身）にリダイレクト
  const isNewRegistration = !existing;
  const redirectUrl = new URL(state.callbackUrl!);
  redirectUrl.searchParams.set("status", "success");
  redirectUrl.searchParams.set(
    isNewRegistration ? "scout_registered" : "scout_linked",
    "true",
  );

  const response = NextResponse.redirect(redirectUrl.toString());
  response.cookies.delete("scout_csrf");

  // callback が scout 自身のドメインを指している場合は Supabase セッションも
  // 確立してから返す（issue #253）。プロダクト側へ戻るケースではセッション不要。
  // handleDirectLogin と同じ magic link → verifyOtp 手順で response に cookie を載せる。
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (baseUrl && redirectUrl.origin === baseUrl) {
    // 既存ユーザーは findExistingStudent で取れた email、新規ユーザーは
    // 直前に createUser で使った値（email || `${sub}@line.scout.local`）と一致させる。
    // existing.email も "" の可能性があるため、ここも falsy fallback (||) を使う。
    const sessionEmail =
      existing?.email || email || `${lineUser.sub}@line.scout.local`;

    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email: sessionEmail,
      });

    if (linkError || !linkData) {
      throw new Error(
        `セッショントークンの生成に失敗しました: ${linkError?.message}`,
      );
    }

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
  }

  return response;
}

// ========================================
// ヘルパー
// ========================================

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

/**
 * LINE UID or メアドで既存の学生を検索
 */
// isProfileComplete が必要とする全必須カラムを含めて取得する。
// （university 単独判定の頃の名残で line_uid と university のみ select していたが、
//  必須項目すべて揃っているかを判定するため拡張）
const STUDENT_COMPLETION_COLUMNS =
  "id, line_uid, last_name, first_name, last_name_kana, first_name_kana, email, phone, birthdate, gender, university, faculty, department, academic_type, graduation_year, postal_code, prefecture, city, street";

async function findExistingStudent(
  supabase: SupabaseAdmin,
  lineUid: string,
  email: string | undefined,
) {
  const { data: byLineUid } = await supabase
    .from("students")
    .select(STUDENT_COMPLETION_COLUMNS)
    .eq("line_uid", lineUid)
    .maybeSingle();

  if (byLineUid) return byLineUid;

  if (email) {
    const { data: byEmail } = await supabase
      .from("students")
      .select(STUDENT_COMPLETION_COLUMNS)
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
