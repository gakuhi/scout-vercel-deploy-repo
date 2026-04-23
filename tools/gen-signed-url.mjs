#!/usr/bin/env node

/**
 * 同時登録フロー（プロダクト → scout）の HMAC 署名付き URL を生成するスクリプト。
 *
 * staging にデプロイ済みの scout に対して curl / ブラウザで疎通確認したい時に使う。
 * プロダクト側実装前の「scout 側 API 仕様の動作確認」が主目的。
 *
 * 署名アルゴリズムは src/lib/line/hmac.ts の generateHmacSignature と等価。
 *   HMAC-SHA256(source + source_user_id + email + callback_url, secret) → hex
 * ここで再実装しているのは、Node 標準ランタイムだけで実行できるようにするため。
 *
 * 使い方:
 *   node --env-file=.env.local tools/gen-signed-url.mjs \
 *     --source smartes \
 *     --user-id ext-user-001 \
 *     [--email test@example.com] \
 *     --callback https://webhook.site/xxxxx \
 *     --base-url https://scout-staging.vercel.app
 *
 * --email は省略可（プロダクト側が email を保持していないケース）。
 * 省略時は URL に email= (空文字) を付与し、HMAC 対象にも空文字を連結する。
 *
 * 必要な環境変数（.env.local 等で設定）:
 *   SCOUT_HMAC_SECRET_{SMARTES,INTERVIEWAI,COMPAI,SUGOSHU}
 *     staging / 手元 scout の環境変数と同じ値をコピーする
 *   SCOUT_BASE_URL (省略可、--base-url の代替)
 *     指定なしの場合、--base-url フラグが必須。"うっかり localhost に打つ"
 *     防止のため default 値は持たない。
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

  // email は optional。未指定は空文字扱いとし、HMAC 対象にも空文字で連結する。
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
      "  node --env-file=.env.local tools/gen-signed-url.mjs \\",
      "    --source smartes \\",
      "    --user-id ext-user-001 \\",
      "    [--email test@example.com] \\",
      "    --callback https://webhook.site/xxxxx \\",
      "    --base-url https://scout-staging.vercel.app",
      "",
      "--email は省略可（プロダクト側が email を持たない場合）。省略時は",
      "URL に email= (空文字) を付与し、HMAC 対象にも空文字で連結する。",
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

  const url = new URL("/api/student/auth/line", baseUrl);
  url.searchParams.set("source", source);
  url.searchParams.set("source_user_id", sourceUserId);
  url.searchParams.set("email", email);
  url.searchParams.set("callback_url", callbackUrl);
  url.searchParams.set("signature", signature);

  console.log(url.toString());
}

main();
