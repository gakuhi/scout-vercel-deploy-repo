#!/usr/bin/env node

/**
 * Supabase Realtime（chat_messages の postgres_changes INSERT 配信）の
 * end-to-end 動作確認スクリプト。
 *
 * 検証内容:
 *   1) publication に chat_messages が含まれているか
 *      （実際は subscribe + INSERT が通るかでまとめて確認）
 *   2) 学生 JWT で chat_messages の RLS SELECT が通るか
 *   3) 別クライアント（service role）からの INSERT が
 *      学生クライアントの postgres_changes ハンドラに届くか
 *
 * 使い方（ローカル Supabase 起動 + seed 投入済の前提）:
 *   node --env-file=.env.local tools/verify-chat-realtime.mjs
 *
 * 必要な環境変数:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * seed の前提:
 *   学生 student-a@test.com (パスワード password123) と
 *   accepted スカウト eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee が存在すること
 *   (supabase/seed.sql で作成される)。
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error(
    "Missing env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const SCOUT_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const COMPANY_MEMBER = "33333333-3333-3333-3333-333333333333";
const STUDENT_EMAIL = "student-a@test.com";
const STUDENT_PASSWORD = "password123";

const log = (...args) => console.log(`[${new Date().toISOString()}]`, ...args);

async function main() {
  // 1) 学生として認証
  const studentClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: signIn, error: signInErr } =
    await studentClient.auth.signInWithPassword({
      email: STUDENT_EMAIL,
      password: STUDENT_PASSWORD,
    });
  if (signInErr) {
    log("LOGIN FAILED:", signInErr.message);
    process.exit(1);
  }
  log("LOGIN OK as", signIn.user?.email);

  // ブラウザでは @supabase/ssr の createBrowserClient が cookie 経由で
  // realtime にもセッションを伝播してくれるが、Node スクリプト単体では
  // 明示的に setAuth を呼ばないと realtime 側が anon 扱いとなり RLS で蹴られる。
  studentClient.realtime.setAuth(signIn.session.access_token);

  // 2) RLS が SELECT を通すか
  const { data: existing, error: selectErr } = await studentClient
    .from("chat_messages")
    .select("id")
    .eq("scout_id", SCOUT_ID);
  if (selectErr) {
    log("SELECT FAILED (RLS issue?):", selectErr.message);
    process.exit(1);
  }
  log("SELECT OK, existing messages:", existing.length);

  // 3) Realtime subscribe（INSERT を学生クライアント側で受け取れるか）
  const subPromise = new Promise((resolve) => {
    studentClient
      .channel("verify-chat-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `scout_id=eq.${SCOUT_ID}`,
        },
        (payload) => resolve(payload.new),
      )
      .subscribe((status, err) => {
        log("subscribe status:", status, err?.message ?? "");
      });
    setTimeout(() => resolve(null), 8000); // 8 秒タイムアウト
  });

  // チャネル確立を待つ。SUBSCRIBED 直後の INSERT が落ちないようゆとりを取る。
  await new Promise((r) => setTimeout(r, 1500));
  log("subscription should be established now, inserting via service role...");

  // 4) 別クライアント（service role）で INSERT
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
  const testContent = `Realtime test ${Date.now()}`;
  const { error: insertErr } = await adminClient.from("chat_messages").insert({
    scout_id: SCOUT_ID,
    sender_id: COMPANY_MEMBER,
    sender_role: "company_member",
    content: testContent,
  });
  if (insertErr) {
    log("INSERT FAILED:", insertErr.message);
    process.exit(1);
  }
  log("INSERT OK content:", testContent);

  // 5) 受信を待つ
  const result = await subPromise;
  if (result && result.content === testContent) {
    log("✅ PASS: 学生クライアントが INSERT イベントを受信しました");
    log("    publication ✅ / RLS SELECT ✅ / realtime delivery ✅");
    process.exit(0);
  } else if (result) {
    log("⚠️  受信したが内容が一致しません:", result.content);
    process.exit(2);
  } else {
    log("❌ FAIL: 8 秒以内に realtime イベントを受信できませんでした");
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
