import { sendNotificationEmail } from "@/lib/email/notification";
import { buildTextMessage, pushLineMessage } from "@/lib/line/messaging";
import { createAdminClient } from "@/lib/supabase/admin";

import { resolveEmailTarget } from "./resolve-email-target";
import { resolveLineTarget } from "./resolve-line-target";
import {
  getCompanyNotificationSettings,
  getStudentNotificationSettings,
  shouldSendEmail,
  shouldSendLine,
} from "./settings";
import type { NotifyInput, NotifyResult } from "./types";

/**
 * 通知基盤の司令塔。全チャネル（LINE / メール / アプリ内）の単一窓口。
 *
 * 処理の流れ:
 *   1. 受信者の通知設定を取得（学生 / 企業担当者で分岐）
 *   2. notifications に INSERT（Service Role）— 設定に関わらず常時実行
 *   3. 学生宛: 種別 ON なら LINE user_id を解決して push、line_sent_at を更新
 *   4. 企業担当者宛: 種別 ON かつマスター ON ならメールアドレスを解決して Resend で送信
 *
 * 学生は LINE 専用、企業担当者はメール専用という非対称設計
 * （docs/development/03-03-notification-design.md 参照）。
 *
 * アプリ内通知（`notifications`）は履歴として常に残す方針のため、
 * 通知設定の ON/OFF は外部チャネル（LINE / メール）にのみ適用する。
 *
 * 失敗時のポリシー:
 *   - LINE / メール送信失敗は握りつぶす。アプリ内通知は残す。
 *   - アプリ内通知の INSERT 失敗は例外として再送出する（呼び出し元でハンドル）。
 *   - 通知設定の取得失敗は例外として再送出する。
 *
 * Service Role Key 必須: notifications への INSERT は RLS で Service Role に限定されている。
 */
export async function notify(input: NotifyInput): Promise<NotifyResult> {
  const admin = createAdminClient();

  const settings =
    input.recipientRole === "student"
      ? await getStudentNotificationSettings(admin, input.userId)
      : await getCompanyNotificationSettings(admin, input.userId);

  const result: NotifyResult = { lineSent: false, emailSent: false };

  const { data, error } = await admin
    .from("notifications")
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      reference_type: input.referenceType ?? null,
      reference_id: input.referenceId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`notifications INSERT に失敗: ${error.message}`);
  }
  result.notificationId = data.id;

  if (shouldSendLine(input.recipientRole, input.type, settings)) {
    try {
      const lineUserId = await resolveLineTarget(
        admin,
        input.userId,
        input.recipientRole,
      );
      if (lineUserId) {
        const text = input.body
          ? `${input.title}\n\n${input.body}`
          : input.title;
        await pushLineMessage(lineUserId, [buildTextMessage(text)]);

        const { error: updateError } = await admin
          .from("notifications")
          .update({ line_sent_at: new Date().toISOString() })
          .eq("id", result.notificationId);
        if (updateError) {
          // LINE 送信自体は成功しているので lineSent: true のままにする。
          // line_sent_at が NULL のまま残るため、将来のリトライキュー実装時に
          // ログから救済できるよう warn ではなく error で目立たせる。
          console.error(
            `[notify] line_sent_at の更新に失敗（LINE 送信自体は成功）: ${updateError.message}`,
            { notificationId: result.notificationId },
          );
        }
        result.lineSent = true;
      }
    } catch (error) {
      // LINE 送信失敗はアプリ内通知の可用性を下げないため握りつぶす。
      // リトライは別 Issue（リトライキュー実装）で扱う。
      console.error("[notify] LINE push failed:", error);
    }
  }

  if (shouldSendEmail(input.recipientRole, input.type, settings)) {
    try {
      const email = await resolveEmailTarget(
        admin,
        input.userId,
        input.recipientRole,
      );
      if (email) {
        const sent = await sendNotificationEmail({
          to: email,
          type: input.type,
          title: input.title,
          body: input.body,
        });
        result.emailSent = sent;
      }
    } catch (error) {
      // メール送信失敗もアプリ内通知の可用性を下げないため握りつぶす。
      console.error("[notify] email send failed:", error);
    }
  }

  return result;
}
