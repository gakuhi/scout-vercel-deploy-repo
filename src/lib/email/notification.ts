import {
  NOTIFICATION_TYPE_LABELS,
  type NotificationType,
} from "@/features/notification/lib/types";
import { getResend } from "@/lib/resend/client";

/**
 * 通知メールを Resend で送信する。
 *
 * 失敗時は false を返し、呼び出し側で握りつぶす想定（fail-open ポリシー）。
 * 本関数自体は throw せず、Resend SDK のエラーや `RESEND_API_KEY` 未設定も
 * console.error でログしたうえで false を返す。
 *
 * subject にはユーザー入力由来の文字列（title）が混ざるため、メールヘッダー
 * インジェクション対策として CR / LF を空白に置換する。本文（HTML）は
 * `escapeHtml()` で XSS 対策する。
 *
 * テンプレートは staging 側 src/features/company/app/notifications/create.ts
 * から移送（後続 PR で staging 側を notify() 経由に置き換えて削除する想定）。
 */
export async function sendNotificationEmail(input: {
  to: string;
  type: NotificationType;
  title: string;
  body?: string;
}): Promise<boolean> {
  try {
    const resend = getResend();

    const typeLabel = NOTIFICATION_TYPE_LABELS[input.type];
    const safeSubject = `【${typeLabel}】${input.title}`.replace(
      /[\r\n]+/g,
      " ",
    );

    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "ScoutLink <onboarding@resend.dev>",
      to: input.to,
      subject: safeSubject,
      html: buildNotificationHtml(input.title, input.body, typeLabel),
    });

    if (error) {
      console.error("[email] sendNotificationEmail Resend error:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] sendNotificationEmail failed:", e);
    return false;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildNotificationHtml(
  title: string,
  body: string | undefined,
  typeLabel: string,
): string {
  const safeTitle = escapeHtml(title);
  const safeTypeLabel = escapeHtml(typeLabel);
  const safeBody = body ? escapeHtml(body) : "";

  return `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; background-color: #f8f9fb; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <p style="font-size: 11px; color: #737780; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">
      ${safeTypeLabel}
    </p>
    <h1 style="font-size: 18px; font-weight: 800; color: #001f41; margin-bottom: 16px;">
      ${safeTitle}
    </h1>
    ${safeBody ? `<p style="font-size: 14px; color: #43474f; line-height: 1.8;">${safeBody}</p>` : ""}
    <hr style="border: none; border-top: 1px solid #eceef0; margin: 32px 0 16px;">
    <p style="font-size: 11px; color: #c3c6d1; text-align: center;">
      ScoutLink
    </p>
  </div>
</body>
</html>`.trim();
}
