#!/usr/bin/env node

/**
 * 同時登録フロー（プロダクト → scout）の HMAC 署名付き form を生成するスクリプト。
 *
 * scout は POST /api/student/auth/line を form body で受け取る仕様のため、
 * ブラウザから直接 URL で叩けない。このスクリプトは自動 submit する HTML を
 * 標準出力に吐くので、ファイル保存してブラウザで開くと form が自動送信される。
 *
 * 署名アルゴリズムは src/lib/line/hmac.ts の generateHmacSignature と等価。
 *   HMAC-SHA256(source + source_user_id + email + callback_url, secret) → hex
 *
 * 使い方:
 *   node --env-file=.env.local tools/gen-signed-form.mjs \
 *     --source smartes \
 *     --user-id ext-user-001 \
 *     [--email test@example.com] \
 *     --callback https://webhook.site/xxxxx \
 *     --base-url https://scout-staging.vercel.app \
 *     > /tmp/scout-redirect.html && open /tmp/scout-redirect.html
 *
 * --email は省略可（プロダクト側が email を保持していないケース）。
 * 省略時は form に email= (空文字) を含め、HMAC 対象にも空文字を連結する。
 *
 * 必要な環境変数（.env.local 等で設定）:
 *   SCOUT_HMAC_SECRET_{SMARTES,INTERVIEWAI,COMPAI,SUGOSHU}
 *     staging / 手元 scout の環境変数と同じ値をコピーする
 *   SCOUT_BASE_URL (省略可、--base-url の代替)
 *     指定なしの場合、--base-url フラグが必須。
 */

import { createHmac } from "node:crypto";
import { parseArgs } from "node:util";

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      source: { type: "string" },
      "user-id": { type: "string" },
      email: { type: "string" },
      callback: { type: "string" },
      "base-url": { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  const baseUrl = values["base-url"] ?? process.env.SCOUT_BASE_URL;

  const missing = [];
  if (!values.source) missing.push("--source");
  if (!values["user-id"]) missing.push("--user-id");
  if (!values.callback) missing.push("--callback");
  if (!baseUrl) missing.push("--base-url (または環境変数 SCOUT_BASE_URL)");

  if (missing.length > 0) {
    console.error(`必須引数が不足: ${missing.join(", ")}`);
    printUsage();
    process.exit(1);
  }

  return {
    source: values.source,
    sourceUserId: values["user-id"],
    email: values.email ?? "",
    callbackUrl: values.callback,
    baseUrl,
  };
}

function printUsage() {
  console.error(
    [
      "使い方:",
      "  node --env-file=.env.local tools/gen-signed-form.mjs \\",
      "    --source smartes \\",
      "    --user-id ext-user-001 \\",
      "    [--email test@example.com] \\",
      "    --callback https://webhook.site/xxxxx \\",
      "    --base-url https://scout-staging.vercel.app",
      "",
      "出力は auto-submit 付き HTML。`> /tmp/x.html && open /tmp/x.html` で",
      "ブラウザが form を自動 POST し、LINE ログインフローに入る。",
      "",
      "--email は省略可（プロダクト側が email を保持していないケース）。省略時は",
      "form に email= (空文字) を含め、HMAC 対象にも空文字を連結する。",
      "",
      "必要な環境変数: SCOUT_HMAC_SECRET_{SMARTES|INTERVIEWAI|COMPAI|SUGOSHU}",
      "--base-url の代替として SCOUT_BASE_URL を設定可。どちらも無い場合はエラー。",
    ].join("\n"),
  );
}

function getSecret(source) {
  const envKey = `SCOUT_HMAC_SECRET_${source.toUpperCase()}`;
  const secret = process.env[envKey];
  if (!secret) {
    console.error(
      `環境変数 ${envKey} が未設定です。.env.local に追加するか --env-file で読み込んでください。`,
    );
    process.exit(1);
  }
  return secret;
}

function generateSignature({ source, sourceUserId, email, callbackUrl, secret }) {
  const data = `${source}${sourceUserId}${email}${callbackUrl}`;
  return createHmac("sha256", secret).update(data).digest("hex");
}

/**
 * HTML 属性値エスケープ。
 * hidden input の value として埋め込むので & " < > ' をエスケープする。
 */
function escapeAttr(v) {
  return String(v)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("'", "&#39;");
}

function buildHtml({ source, sourceUserId, email, callbackUrl, baseUrl, signature }) {
  const actionUrl = new URL("/api/student/auth/line", baseUrl).toString();
  const fields = [
    ["source", source],
    ["source_user_id", sourceUserId],
    ["email", email],
    ["callback_url", callbackUrl],
    ["signature", signature],
  ];
  const hiddens = fields
    .map(
      ([name, value]) =>
        `  <input type="hidden" name="${escapeAttr(name)}" value="${escapeAttr(value)}">`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>scout registration redirect</title>
</head>
<body>
  <p>Submitting to scout…</p>
  <form id="f" method="POST" action="${escapeAttr(actionUrl)}">
${hiddens}
    <noscript><button type="submit">Continue</button></noscript>
  </form>
  <script>document.getElementById("f").submit();</script>
</body>
</html>
`;
}

function main() {
  const { source, sourceUserId, email, callbackUrl, baseUrl } = parseCliArgs();
  const secret = getSecret(source);

  const signature = generateSignature({
    source,
    sourceUserId,
    email,
    callbackUrl,
    secret,
  });

  process.stdout.write(
    buildHtml({
      source,
      sourceUserId,
      email,
      callbackUrl,
      baseUrl,
      signature,
    }),
  );
}

main();
