#!/usr/bin/env -S npx tsx
/**
 * 通知の見た目（LINE Flex / メール HTML）のローカルプレビュー用サンプルを生成する。
 *
 * 各通知種別ごとに:
 *   - tools/samples/line/<type>.json   ... `tools/send-line-test.mjs --flex <path>` に渡せる Flex 1 件分
 *   - tools/samples/email/<type>.html  ... ブラウザで開いてレイアウトを確認できる HTML
 *
 * 使い方:
 *   npx tsx tools/dump-notification-samples.ts
 *
 * 生成された JSON / HTML は出力確認のみが目的なので、git に含めない（.gitignore 推奨）。
 *
 * 本スクリプトは src 側のレンダラ（`renderLineNotificationMessage`,
 * `buildNotificationHtml`）を直接 import するため、本番に出るのと **完全に同じ**
 * 出力を確認できる。文言だけのモック表示にしないこと。
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildActionUrl } from "../src/features/notification/lib/build-action-url";
import { renderLineNotificationMessage } from "../src/features/notification/lib/render-line";
import {
  NOTIFICATION_TYPE_LABELS,
  type NotificationRecipientRole,
  type NotificationType,
} from "../src/features/notification/lib/types";
import { buildNotificationHtml } from "../src/lib/email/notification";

// プレビュー用ベース URL（actionUrl が解決された見た目を確認するため）
process.env.NEXT_PUBLIC_BASE_URL ??= "https://scout.example.com";

type Sample = {
  type: NotificationType;
  recipientRole: NotificationRecipientRole;
  title: string;
  body?: string;
  referenceType?: string;
  referenceId?: string;
};

/**
 * 各種別のプレビュー用サンプル。代表的な使い方を 1 つずつ。
 *
 * - 学生宛 (LINE 経路): scout_received / chat_new_message / event_reminder / system_announcement
 * - 企業宛 (メール経路): scout_accepted / scout_declined / chat_new_message / event_reminder / system_announcement
 *
 * `recipientRole` は actionUrl の遷移先決定にしか効かないので、LINE プレビューは
 * 学生役割で十分（LINE は学生専用）。メールも企業役割で十分（メールは企業専用）。
 */
const LINE_SAMPLES: Sample[] = [
  {
    type: "scout_received",
    recipientRole: "student",
    title: "新しいスカウトが届きました",
    body: "ココシロ株式会社「ソフトウェアエンジニア」のスカウトが届いています。",
    referenceType: "scouts",
    referenceId: "scout-12345",
  },
  {
    type: "chat_new_message",
    recipientRole: "student",
    title: "新着メッセージ",
    body: "ココシロ株式会社からメッセージが届いています。",
    referenceType: "scouts",
    referenceId: "scout-12345",
  },
  {
    type: "event_reminder",
    recipientRole: "student",
    title: "イベント開催が近づいています",
    body: "「就活キックオフセミナー」は 5/12 (火) 19:00 に開始です。",
    referenceType: "events",
    referenceId: "event-77",
  },
  {
    type: "system_announcement",
    recipientRole: "student",
    title: "ScoutLink からのお知らせ",
    body: "5/3 (土) 02:00–04:00 にメンテナンスを実施します。",
  },
];

const EMAIL_SAMPLES: Sample[] = [
  {
    type: "scout_accepted",
    recipientRole: "company_member",
    title: "スカウトが承諾されました",
    body: "山田 太郎 様より、スカウトの承諾回答をいただきました。チャット画面より連絡を取り、選考案内等にお進みください。",
    referenceType: "scouts",
    referenceId: "scout-12345",
  },
  // scout_declined はメール / LINE では通知しない方針のため、プレビュー対象外
  // （settings.ts の isTypeEnabled で常に false を返す）。
  {
    type: "chat_new_message",
    recipientRole: "company_member",
    title: "新着メッセージ",
    body: "山田 太郎 様より、新着メッセージが届いています。",
    referenceType: "scouts",
    referenceId: "scout-12345",
  },
  {
    type: "event_reminder",
    recipientRole: "company_member",
    title: "イベント開催が近づいています",
    body: "「採用説明会」を 5/12 (火) 19:00 より開催予定です。",
    referenceType: "events",
    referenceId: "event-77",
  },
  {
    type: "system_announcement",
    recipientRole: "company_member",
    title: "ScoutLink からのお知らせ",
    body: "5/3 (土) 02:00–04:00 にシステムメンテナンスを実施いたします。ご不便をおかけしますがご了承ください。",
  },
];

function dumpLineSamples(outDir: string): string[] {
  const written: string[] = [];
  for (const s of LINE_SAMPLES) {
    const actionUrl = buildActionUrl({
      recipientRole: s.recipientRole,
      type: s.type,
      referenceType: s.referenceType,
      referenceId: s.referenceId,
    });
    const [message] = renderLineNotificationMessage({
      type: s.type,
      title: s.title,
      body: s.body,
      actionUrl,
    });
    if (message.type !== "flex") {
      throw new Error("Flex Message 期待だが Text が返った");
    }
    const path = resolve(outDir, `${s.type}.json`);
    writeFileSync(path, JSON.stringify(message, null, 2));
    written.push(path);
  }
  return written;
}

/**
 * ローカルプレビューでロゴが見えるよう、本番では絶対 URL（NEXT_PUBLIC_BASE_URL
 * 配下）を指す `<img src>` を、base64 data URI に差し替える。
 * プロダクトコード側（`buildNotificationHtml`）は絶対 URL のまま。
 */
function inlineLogoForPreview(html: string, projectRoot: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") ?? "";
  const remoteLogoUrl = `${baseUrl}/logos/black.png`;
  const png = readFileSync(resolve(projectRoot, "public/logos/black.png"));
  const dataUri = `data:image/png;base64,${png.toString("base64")}`;
  return html.split(remoteLogoUrl).join(dataUri);
}

function dumpEmailSamples(outDir: string, projectRoot: string): string[] {
  const written: string[] = [];
  for (const s of EMAIL_SAMPLES) {
    const actionUrl = buildActionUrl({
      recipientRole: s.recipientRole,
      type: s.type,
      referenceType: s.referenceType,
      referenceId: s.referenceId,
    });
    const html = buildNotificationHtml({
      type: s.type,
      typeLabel: NOTIFICATION_TYPE_LABELS[s.type],
      title: s.title,
      body: s.body,
      actionUrl,
    });
    const path = resolve(outDir, `${s.type}.html`);
    writeFileSync(path, inlineLogoForPreview(html, projectRoot));
    written.push(path);
  }
  return written;
}

function dumpEmailIndex(outDir: string, htmlPaths: string[]): string {
  const items = htmlPaths
    .map((p) => p.split("/").pop() as string)
    .map(
      (name) =>
        `<li><a href="./${name}" target="_blank" rel="noopener">${name}</a></li>`,
    )
    .join("\n      ");
  const html = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><title>Notification email previews</title></head>
<body style="font-family: sans-serif; padding: 24px;">
  <h1>通知メール HTML プレビュー</h1>
  <p>各リンクを開いて見た目を確認してください。</p>
  <ul>
      ${items}
  </ul>
</body>
</html>`;
  const path = resolve(outDir, "index.html");
  writeFileSync(path, html);
  return path;
}

function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, "..");
  const samplesRoot = resolve(root, "tools", "samples");
  const lineDir = resolve(samplesRoot, "line");
  const emailDir = resolve(samplesRoot, "email");
  mkdirSync(lineDir, { recursive: true });
  mkdirSync(emailDir, { recursive: true });

  const lineFiles = dumpLineSamples(lineDir);
  const emailFiles = dumpEmailSamples(emailDir, root);
  const emailIndex = dumpEmailIndex(emailDir, emailFiles);

  console.log("LINE Flex JSON (use with: node --env-file=.env.local tools/send-line-test.mjs --to <U...> --flex <path>)");
  for (const f of lineFiles) console.log(`  ${f}`);
  console.log("\nEmail HTML previews (open in browser):");
  for (const f of emailFiles) console.log(`  ${f}`);
  console.log(`\nIndex: ${emailIndex}`);
}

main();
