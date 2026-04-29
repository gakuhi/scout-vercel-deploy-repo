"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/shared/types/database";
import type { NotificationType } from "./schemas";

type CompanyNotificationSettingsRow =
  Database["public"]["Tables"]["company_notification_settings"]["Row"];

// 通知種別 → company_notification_settings カラム名のマッピング。
// - scout_received は学生側専用なので含めない
// - event_reminder は対応カラムが未追加なので gating 対象外（マップに載せない）
const SETTING_KEY_MAP: Partial<
  Record<NotificationType, keyof CompanyNotificationSettingsRow>
> = {
  scout_accepted: "scout_accepted",
  scout_declined: "scout_declined",
  chat_new_message: "chat_message",
  system_announcement: "system_announcement",
};

/**
 * 通知設定を確認した上で通知を作成する共通関数。
 * - 種別設定: SETTING_KEY_MAP のカラムが false ならスキップ
 * - アプリ内通知: in_app_enabled が true なら notifications テーブルに INSERT
 * - メール送信: 通知基盤 (PR #250) 側で扱う想定。本ファイルでは扱わない
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
}): Promise<{ created: boolean; error?: string }> {
  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("company_notification_settings")
    .select("*")
    .eq("company_member_id", userId)
    .maybeSingle();

  // 種別ごとの設定チェック（SETTING_KEY_MAP に載っている種別のみ）
  const settingKey = SETTING_KEY_MAP[type];
  if (settingKey && settings && settings[settingKey] === false) {
    return { created: false };
  }

  const inAppEnabled = settings?.in_app_enabled ?? true;

  if (!inAppEnabled) {
    return { created: false };
  }

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
    return { created: false, error: "通知の作成に失敗しました" };
  }

  return { created: true };
}
