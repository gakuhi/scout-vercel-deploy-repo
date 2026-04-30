#!/usr/bin/env node

/**
 * 新規企業を 1 社オンボーディングする運用スクリプト。
 *
 * 1 つの "契約" に対して 1 回だけ実行する想定。実行内容:
 *   1. companies INSERT（is_verified=true で公開状態にする）
 *   2. auth.admin.inviteUserByEmail で owner を招待（メールが届く）
 *   3. updateUserById で app_metadata.role = "company_owner" をセット
 *      （RLS の get_user_role() が JWT の app_metadata.role を見るため必須）
 *   4. company_members INSERT（id = 招待した auth.users.id, role='owner'）
 *   5. company_plans INSERT（plan_type / scout_quota）
 *
 * 途中で失敗したら作成済みのレコードと auth.users を削除してロールバックする。
 *
 * 2 人目以降のメンバー招待は画面上の招待機能（src/features/company/app/members/actions/invite.ts）
 * を使うこと。このスクリプトは "1 社目の owner を作る瞬間" だけが責務。
 *
 * 使い方:
 *   # 普段の .env.local とは別に .env.production.local を用意し、
 *   # NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY に remote の値を入れておく。
 *   # （.env.production.local は .gitignore 済み）
 *
 *   node --env-file=.env.production.local tools/onboard-company.mjs \
 *     --name "株式会社サンプル" \
 *     --owner-email tanaka@example.com \
 *     --owner-last 田中 \
 *     --owner-first 太郎 \
 *     [--industry "IT"] \
 *     [--website https://example.com] \
 *     [--employee-count "10-50"] \
 *     [--plan free] \
 *     [--quota 0] \
 *     [--no-verified] \
 *     [--yes]
 *
 * 必須引数: --name --owner-email --owner-last --owner-first
 * 省略可:
 *   --industry / --website / --employee-count … companies の任意カラム
 *   --plan          plan_type のデフォルト 'free'
 *   --quota         scout_quota のデフォルト 0
 *   --no-verified   is_verified=false で作成（テスト用ダミー企業など）
 *   --yes           remote 確認プロンプトをスキップ
 *
 * 必要な環境変数:
 *   NEXT_PUBLIC_SUPABASE_URL       remote Supabase の URL
 *   SUPABASE_SERVICE_ROLE_KEY      remote Supabase の service role key（絶対コミット禁止）
 */

import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      name: { type: "string" },
      "owner-email": { type: "string" },
      "owner-last": { type: "string" },
      "owner-first": { type: "string" },
      industry: { type: "string" },
      website: { type: "string" },
      "employee-count": { type: "string" },
      plan: { type: "string" },
      quota: { type: "string" },
      "no-verified": { type: "boolean" },
      yes: { type: "boolean", short: "y" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  const missing = [];
  if (!values.name) missing.push("--name");
  if (!values["owner-email"]) missing.push("--owner-email");
  if (!values["owner-last"]) missing.push("--owner-last");
  if (!values["owner-first"]) missing.push("--owner-first");
  if (missing.length > 0) {
    console.error(`必須引数が不足: ${missing.join(", ")}`);
    printUsage();
    process.exit(1);
  }

  const quota = values.quota ? Number(values.quota) : 0;
  if (Number.isNaN(quota) || quota < 0) {
    console.error(`--quota は 0 以上の整数で指定してください（受信値: ${values.quota}）`);
    process.exit(1);
  }

  return {
    name: values.name,
    ownerEmail: values["owner-email"],
    ownerLast: values["owner-last"],
    ownerFirst: values["owner-first"],
    industry: values.industry ?? null,
    websiteUrl: values.website ?? null,
    employeeCountRange: values["employee-count"] ?? null,
    planType: values.plan ?? "free",
    scoutQuota: quota,
    isVerified: !values["no-verified"],
    skipConfirm: !!values.yes,
  };
}

function printUsage() {
  console.error(
    [
      "使い方:",
      "  node --env-file=.env.production.local tools/onboard-company.mjs \\",
      '    --name "株式会社サンプル" \\',
      "    --owner-email tanaka@example.com \\",
      "    --owner-last 田中 --owner-first 太郎 \\",
      '    [--industry "IT"] [--website https://example.com] [--employee-count "10-50"] \\',
      "    [--plan free] [--quota 0] [--no-verified] [--yes]",
      "",
      "必要な環境変数: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
    ].join("\n"),
  );
}

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "環境変数 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です。",
    );
    console.error(
      "remote 用の値を .env.production.local に置き、--env-file=.env.production.local で読み込んでください。",
    );
    process.exit(1);
  }
  return { url, key };
}

async function confirmTarget({ url, args }) {
  const isLocal = /127\.0\.0\.1|localhost/.test(url);
  console.log("─".repeat(60));
  console.log(`接続先 Supabase : ${url}${isLocal ? "  [LOCAL]" : "  [REMOTE]"}`);
  console.log(`企業名         : ${args.name}`);
  console.log(`Owner          : ${args.ownerLast} ${args.ownerFirst} <${args.ownerEmail}>`);
  console.log(`is_verified    : ${args.isVerified}`);
  console.log(`plan / quota   : ${args.planType} / ${args.scoutQuota}`);
  if (args.industry) console.log(`industry       : ${args.industry}`);
  if (args.websiteUrl) console.log(`website        : ${args.websiteUrl}`);
  if (args.employeeCountRange) console.log(`employees      : ${args.employeeCountRange}`);
  console.log("─".repeat(60));
  console.log(
    "実行すると companies / auth.users / company_members / company_plans に",
  );
  console.log("レコードが作成され、owner 宛に招待メールが送信されます。");

  if (args.skipConfirm) return;

  const rl = createInterface({ input, output });
  const answer = await rl.question("続行しますか？ [y/N]: ");
  rl.close();
  if (answer.trim().toLowerCase() !== "y") {
    console.log("中止しました。");
    process.exit(0);
  }
}

async function main() {
  const args = parseCliArgs();
  const { url, key } = getSupabaseEnv();

  await confirmTarget({ url, args });

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ---------- 1. companies INSERT ----------
  const companyInsert = {
    name: args.name,
    industry: args.industry,
    website_url: args.websiteUrl,
    employee_count_range: args.employeeCountRange,
    is_verified: args.isVerified,
    verified_at: args.isVerified ? new Date().toISOString() : null,
  };
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert(companyInsert)
    .select("id")
    .single();
  if (companyError || !company) {
    console.error("companies INSERT 失敗:", companyError?.message);
    process.exit(1);
  }
  const companyId = company.id;
  console.log(`✓ companies created  : ${companyId}`);

  // ---------- 2. auth.admin.inviteUserByEmail ----------
  // user_metadata は招待メールテンプレ用の参考情報。RLS は app_metadata しか見ない。
  const { data: invite, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    args.ownerEmail,
    {
      data: {
        role: "owner",
        company_id: companyId,
        company_name: args.name,
        invitee_name: `${args.ownerLast} ${args.ownerFirst}`,
      },
    },
  );
  if (inviteError || !invite?.user) {
    console.error("auth invite 失敗:", inviteError?.message);
    await rollback(supabase, { companyId });
    process.exit(1);
  }
  const userId = invite.user.id;
  console.log(`✓ auth user invited  : ${userId} (${args.ownerEmail})`);

  // ---------- 3. app_metadata.role = "company_owner" ----------
  // RLS の get_user_role() は JWT の app_metadata.role を読むので、
  // ここで付けないと owner ログイン後にテーブルがほぼ全部見えない。
  const { error: metadataError } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { role: "company_owner" },
  });
  if (metadataError) {
    console.error("app_metadata 更新失敗:", metadataError.message);
    await rollback(supabase, { companyId, userId });
    process.exit(1);
  }
  console.log("✓ app_metadata set   : role=company_owner");

  // ---------- 4. company_members INSERT ----------
  const { error: memberError } = await supabase.from("company_members").insert({
    id: userId,
    company_id: companyId,
    email: args.ownerEmail,
    last_name: args.ownerLast,
    first_name: args.ownerFirst,
    role: "owner",
    is_active: true,
  });
  if (memberError) {
    console.error("company_members INSERT 失敗:", memberError.message);
    await rollback(supabase, { companyId, userId });
    process.exit(1);
  }
  console.log("✓ company_members    : owner inserted");

  // ---------- 5. company_plans INSERT ----------
  const { error: planError } = await supabase.from("company_plans").insert({
    company_id: companyId,
    plan_type: args.planType,
    scout_quota: args.scoutQuota,
    scouts_sent_this_month: 0,
  });
  if (planError) {
    console.error("company_plans INSERT 失敗:", planError.message);
    await rollback(supabase, { companyId, userId, memberInserted: true });
    process.exit(1);
  }
  console.log(`✓ company_plans      : ${args.planType} / quota=${args.scoutQuota}`);

  console.log("─".repeat(60));
  console.log("オンボーディング完了。");
  console.log(`  company_id : ${companyId}`);
  console.log(`  owner_id   : ${userId}`);
  console.log(
    `  招待メールが ${args.ownerEmail} に送信されました。リンクからパスワード設定後、/company にログインできます。`,
  );
}

/**
 * ロールバック。Supabase は分散トランザクションを張れないので、作成済みリソースを
 * 逆順で best-effort に削除する。途中失敗してもエラーは握りつぶさず、ログだけ出す。
 */
async function rollback(supabase, { companyId, userId, memberInserted }) {
  console.error("ロールバック開始…");
  if (memberInserted && userId) {
    const { error } = await supabase.from("company_members").delete().eq("id", userId);
    if (error) console.error("  company_members delete 失敗:", error.message);
    else console.error("  company_members deleted");
  }
  if (userId) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) console.error("  auth user delete 失敗:", error.message);
    else console.error("  auth user deleted");
  }
  if (companyId) {
    const { error } = await supabase.from("companies").delete().eq("id", companyId);
    if (error) console.error("  companies delete 失敗:", error.message);
    else console.error("  companies deleted");
  }
}

main().catch((err) => {
  console.error("想定外のエラー:", err);
  process.exit(1);
});
