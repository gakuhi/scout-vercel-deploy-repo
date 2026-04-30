#!/usr/bin/env node

/**
 * LINE Messaging API の push 疎通確認スクリプト。
 *
 * 通知基盤（src/features/notification/lib/notify.ts）が叩く
 * pushLineMessage() と等価な POST を行う。実装の差を埋めるため、
 * src/lib/line/messaging.ts と同じエンドポイント・ヘッダ・body 形を使う。
 *
 * 使い方:
 *   # テキスト送信
 *   node --env-file=.env.local tools/send-line-test.mjs \
 *     --to U1234567890abcdef \
 *     [--text "テスト通知です"]
 *
 *   # Flex Message 送信
 *   node --env-file=.env.local tools/send-line-test.mjs \
 *     --to U1234567890abcdef \
 *     --flex tools/line-flex-sample.json
 *
 * 引数:
 *   --to    送信先 LINE user_id（必須）
 *           LINE Developers コンソール → Messaging API チャネル
 *           → Basic Settings の "Your user ID" で自分の user_id を確認できる。
 *           送信先のユーザーは事前に LINE 公式アカウント（このチャネルの bot）を
 *           友だち追加しておく必要がある。
 *   --text  送信するテキスト本文（省略時はテンプレート文）
 *   --flex  Flex Message JSON ファイルへのパス。--text と排他。
 *           ファイルには { "type": "flex", "altText": "...", "contents": {...} }
 *           の形式で Flex Message オブジェクト 1 件を書く。
 *           サンプル: tools/line-flex-sample.json
 *           Flex Message Simulator: https://developers.line.biz/flex-simulator/
 *
 * 必要な環境変数（.env.local 等で設定）:
 *   LINE_MESSAGING_CHANNEL_ACCESS_TOKEN
 *     LINE Messaging API チャネルの長期チャネルアクセストークン。
 *     LINE Login のチャネルとは別物なので注意。
 */

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      to: { type: "string" },
      text: { type: "string" },
      flex: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  if (!values.to) {
    console.error("必須引数が不足: --to <LINE user_id>");
    printUsage();
    process.exit(1);
  }

  if (values.text && values.flex) {
    console.error("--text と --flex は同時に指定できません");
    process.exit(1);
  }

  return {
    to: values.to,
    flexPath: values.flex ?? null,
    text:
      values.text ??
      "【scout 疎通テスト】通知基盤から LINE Messaging API への push が成功しました ✨",
  };
}

function loadFlexMessage(path) {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    console.error(`Flex JSON を読み込めません: ${path}`);
    console.error(`  ${err.message}`);
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`Flex JSON のパースに失敗: ${path}`);
    console.error(`  ${err.message}`);
    process.exit(1);
  }

  if (parsed?.type !== "flex") {
    console.error(`Flex JSON の "type" は "flex" である必要があります（受信: ${parsed?.type}）`);
    process.exit(1);
  }
  if (typeof parsed.altText !== "string" || parsed.altText.length === 0) {
    console.error('Flex JSON に "altText"（文字列）が必要です');
    process.exit(1);
  }
  if (!parsed.contents || typeof parsed.contents !== "object") {
    console.error('Flex JSON に "contents"（bubble または carousel オブジェクト）が必要です');
    process.exit(1);
  }

  return parsed;
}

function printUsage() {
  console.error(
    [
      "使い方:",
      "  # テキスト送信",
      "  node --env-file=.env.local tools/send-line-test.mjs \\",
      "    --to U1234567890abcdef \\",
      "    [--text \"テスト通知です\"]",
      "",
      "  # Flex Message 送信",
      "  node --env-file=.env.local tools/send-line-test.mjs \\",
      "    --to U1234567890abcdef \\",
      "    --flex tools/line-flex-sample.json",
      "",
      "--to は LINE Messaging API の宛先 user_id (Uxxxxxxxx... の形式)。",
      "  - 自分の user_id は LINE Developers コンソールの",
      "    Messaging API チャネル → Basic Settings → \"Your user ID\" で確認できる。",
      "  - 送信先のユーザーは事前に LINE 公式アカウント（このチャネルの bot）を",
      "    友だち追加しておく必要がある（友だち登録なしの push は 400 で弾かれる）。",
      "",
      "--flex には Flex Message JSON へのパスを渡す。--text と排他。",
      "  ファイル形式: { \"type\": \"flex\", \"altText\": \"...\", \"contents\": { ... } }",
      "  Flex Message Simulator で contents を組み立てると楽:",
      "    https://developers.line.biz/flex-simulator/",
      "",
      "必要な環境変数: LINE_MESSAGING_CHANNEL_ACCESS_TOKEN",
    ].join("\n"),
  );
}

function getAccessToken() {
  const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.error(
      "環境変数 LINE_MESSAGING_CHANNEL_ACCESS_TOKEN が未設定です。",
      ".env.local に追加するか --env-file で読み込んでください。",
    );
    process.exit(1);
  }
  return token;
}

async function main() {
  const { to, text, flexPath } = parseCliArgs();
  const token = getAccessToken();

  const message = flexPath
    ? loadFlexMessage(flexPath)
    : { type: "text", text };

  const body = {
    to,
    messages: [message],
  };

  console.log("→ POST https://api.line.me/v2/bot/message/push");
  console.log(`→ message type: ${message.type}`);
  console.log("→ body:", JSON.stringify(body));

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const responseBody = await response.text();

  console.log(`← status: ${response.status} ${response.statusText}`);
  if (responseBody) {
    console.log(`← body  : ${responseBody}`);
  }

  if (!response.ok) {
    console.error("\n✗ LINE push に失敗しました。");
    console.error("  よくある原因:");
    console.error("  - 送信先ユーザーが bot を友だち追加していない");
    console.error("  - user_id がこのチャネルのものでない");
    console.error("  - チャネルアクセストークンが無効/期限切れ");
    process.exit(1);
  }

  console.log("\n✓ LINE push 成功。LINE アプリで受信を確認してください。");
}

main().catch((err) => {
  console.error("予期しないエラー:", err);
  process.exit(1);
});
