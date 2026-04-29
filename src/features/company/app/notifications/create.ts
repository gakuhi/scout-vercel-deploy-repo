"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { NOTIFICATION_TYPE_LABELS } from "./schemas";
import type { NotificationType } from "./schemas";

// 通知種別とDBカラムのマッピング
// scout_received は学生側専用、scout_declined は通知対象外なので企業の設定には含めない
const SETTING_KEY_MAP: Partial<Record<NotificationType, string>> = {
  scout_accepted: "scout_accepted",
  chat_new_message: "chat_message",
  event_reminder: "event_reminder",
  system_announcement: "system_announcement",
};

/**
 * 通知を作成する共通関数。
 * - アプリ内通知: 種別に関わらず常に notifications テーブルに INSERT
 * - メール通知: 種別ごとの設定（scout_accepted, chat_message, event_reminder,
 *   system_announcement）が ON の場合のみメール送信。scout_received は学生側専用、
 *   scout_declined は通知対象外のため企業の設定には含めず、メール送信もしない。
 */
export async function createNotification({
  userId,
  type,
  title,
  body,
  referenceType,
  referenceId,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  referenceType?: string;
  referenceId?: string;
}): Promise<{ created: boolean; emailSent: boolean; error?: string }> {
  const admin = createAdminClient();

  let created = false;
  let emailSent = false;

  // アプリ内通知（常時 INSERT）
  const { error } = await admin.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body: body ?? null,
    reference_type: referenceType ?? null,
    reference_id: referenceId ?? null,
  });

  if (error) {
    console.error("createNotification insert error:", error);
    return { created: false, emailSent: false, error: "通知の作成に失敗しました" };
  }
  created = true;

  // メール通知（種別フラグが ON の場合のみ）
  const settingKey = SETTING_KEY_MAP[type];
  if (settingKey) {
    const { data: settings } = await admin
      .from("company_notification_settings")
      .select("*")
      .eq("company_member_id", userId)
      .maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emailEnabledForType = (settings as any)?.[settingKey] ?? true;

    if (emailEnabledForType) {
      const email = await getUserEmail(admin, userId);
      if (email) {
        emailSent = await sendNotificationEmail({
          to: email,
          type,
          title,
          body,
        });
      }
    }
  }

  return { created, emailSent };
}

/**
 * ユーザーのメールアドレスを取得する。
 * company_members テーブルから取得。
 */
async function getUserEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  userId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("company_members")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  return data?.email ?? null;
}

/**
 * 通知メールを送信する。
 * Resend API を使用。API キーが未設定の場合はスキップ（開発環境対応）。
 */
async function sendNotificationEmail({
  to,
  type,
  title,
  body,
}: {
  to: string;
  type: NotificationType;
  title: string;
  body?: string;
}): Promise<boolean> {
  try {
    const { getResend } = await import("@/lib/resend/client");
    const resend = getResend();

    const typeLabel = NOTIFICATION_TYPE_LABELS[type];
    // subject はメールヘッダーに展開されるため、CR/LF を除去してインジェクションを防ぐ
    const safeSubject = `【${typeLabel}】${title}`.replace(/[\r\n]+/g, " ");
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Executive Monograph <noreply@resend.dev>",
      to,
      subject: safeSubject,
      html: buildNotificationHtml(title, body, typeLabel),
    });

    if (error) {
      console.error("sendNotificationEmail error:", error);
      return false;
    }
    return true;
  } catch (e) {
    // RESEND_API_KEY が未設定の場合など
    console.error("sendNotificationEmail failed:", e);
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
      Executive Monograph
    </p>
  </div>
</body>
</html>`.trim();
}

// --- 通知タイプごとのヘルパー関数 ---

/**
 * スカウト承諾の通知。scouts.sender_id に送る。
 * 辞退時は通知を作成しない方針。
 */
export async function notifyScoutAccepted({
  senderId,
  studentName,
  jobTitle,
  scoutId,
}: {
  senderId: string;
  studentName: string;
  jobTitle: string;
  scoutId: string;
}) {
  return createNotification({
    userId: senderId,
    type: "scout_accepted",
    title: `${studentName}さんがスカウトを承諾しました`,
    body: `「${jobTitle}」のスカウトが承諾されました。`,
    referenceType: "scouts",
    referenceId: scoutId,
  });
}

/**
 * チャット新着の通知。scouts.sender_id に送る。
 */
export async function notifyChatMessage({
  senderId,
  studentName,
  messagePreview,
  scoutId,
}: {
  senderId: string;
  studentName: string;
  messagePreview: string;
  scoutId: string;
}) {
  return createNotification({
    userId: senderId,
    type: "chat_new_message",
    title: `${studentName}さんからメッセージが届きました`,
    body: messagePreview,
    referenceType: "scouts",
    referenceId: scoutId,
  });
}

/**
 * イベントリマインダーの通知。events.created_by に送る。
 */
export async function notifyEventReminder({
  createdBy,
  eventTitle,
  eventId,
}: {
  createdBy: string;
  eventTitle: string;
  eventId: string;
}) {
  return createNotification({
    userId: createdBy,
    type: "event_reminder",
    title: "イベント開催まであと1日です",
    body: `「${eventTitle}」が明日開催されます。`,
    referenceType: "events",
    referenceId: eventId,
  });
}

/**
 * システムお知らせの通知。企業の全メンバーに送る。
 */
export async function notifySystemAnnouncement({
  companyId,
  title,
  body,
}: {
  companyId: string;
  title: string;
  body: string;
}) {
  const admin = createAdminClient();
  const { data: members } = await admin
    .from("company_members")
    .select("id")
    .eq("company_id", companyId)
    .eq("is_active", true);

  if (!members || members.length === 0) return { notified: 0 };

  const results = await Promise.all(
    members.map((member) =>
      createNotification({
        userId: member.id,
        type: "system_announcement",
        title,
        body,
      }),
    ),
  );

  const notified = results.filter((r) => r.created || r.emailSent).length;
  return { notified };
}
