import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/shared/types/database";

import type {
  CompanyNotificationSettings,
  NotificationRecipientRole,
  NotificationType,
  StudentNotificationSettings,
} from "./types";

type AdminClient = SupabaseClient<Database>;

/**
 * 学生の通知設定を取得する。行が存在しない場合は null。
 * （通常は students への INSERT 時にトリガで自動生成されるため存在するはず）
 */
export async function getStudentNotificationSettings(
  admin: AdminClient,
  studentId: string,
): Promise<StudentNotificationSettings | null> {
  const { data, error } = await admin
    .from("student_notification_settings")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `student_notification_settings の取得に失敗: ${error.message}`,
    );
  }
  return data;
}

/**
 * 企業担当者の通知設定を取得する。行が存在しない場合は null。
 */
export async function getCompanyNotificationSettings(
  admin: AdminClient,
  companyMemberId: string,
): Promise<CompanyNotificationSettings | null> {
  const { data, error } = await admin
    .from("company_notification_settings")
    .select("*")
    .eq("company_member_id", companyMemberId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `company_notification_settings の取得に失敗: ${error.message}`,
    );
  }
  return data;
}

/**
 * 通知種別ごとの ON/OFF カラムを引く。
 * 設定行が存在しない場合・対応カラムがない場合は true（ON）をデフォルトとする。
 *
 * - 学生には event_reminder があり、scout_accepted/declined がない
 * - 企業担当者には scout_accepted/declined があり、event_reminder もある
 *   （migration 20260429100000 で event_reminder カラムを追加。staging の
 *   src/features/company/app/notifications/create.ts の SETTING_KEY_MAP も
 *   event_reminder を企業設定にマップしているため、企業もイベントリマインダー対象）
 *
 * 受信者の role と通知 type の組み合わせが不整合な場合（例: 学生に scout_accepted）は
 * 「その受信者にとって送るべき通知ではない」とみなして false を返す。
 */
export function isTypeEnabled(
  role: NotificationRecipientRole,
  type: NotificationType,
  settings:
    | StudentNotificationSettings
    | CompanyNotificationSettings
    | null,
): boolean {
  if (role === "student") {
    const s = settings as StudentNotificationSettings | null;
    switch (type) {
      case "scout_received":
        return s?.scout_received ?? true;
      case "chat_new_message":
        return s?.chat_message ?? true;
      case "event_reminder":
        return s?.event_reminder ?? true;
      case "system_announcement":
        return s?.system_announcement ?? true;
      case "scout_accepted":
      case "scout_declined":
        return false;
    }
  }

  const c = settings as CompanyNotificationSettings | null;
  switch (type) {
    case "scout_accepted":
      return c?.scout_accepted ?? true;
    case "scout_declined":
      return c?.scout_declined ?? true;
    case "chat_new_message":
      return c?.chat_message ?? true;
    case "event_reminder":
      return c?.event_reminder ?? true;
    case "system_announcement":
      return c?.system_announcement ?? true;
    case "scout_received":
      return false;
  }
}

/**
 * LINE 通知の送信可否（学生のみ）: 種別フラグ ON で送信可。
 *
 * 設計上、LINE 通知は学生のみが対象（企業担当者はメール）。
 * `role !== "student"` の場合は常に false。
 *
 * 学生側のマスタートグル `line_enabled` は migration 20260427010000 で
 * drop 済みのため、判定は種別フラグのみ（タイプ別トグルを全 OFF にすれば
 * 一括 OFF と同等）。
 *
 * LINE 連携の有無はこの関数では判定しない（resolveLineTarget() 側で判定）。
 */
export function shouldSendLine(
  role: NotificationRecipientRole,
  type: NotificationType,
  settings:
    | StudentNotificationSettings
    | CompanyNotificationSettings
    | null,
): boolean {
  if (role !== "student") return false;
  return isTypeEnabled(role, type, settings);
}

/**
 * メール通知の送信可否（企業担当者のみ）: 種別フラグ ON かつマスター ON で送信可。
 *
 * 設計上、メール通知は企業担当者のみが対象（学生は LINE）。
 * `role !== "company_member"` の場合は常に false。
 *
 * 企業側のマスタートグルは `company_notification_settings.line_enabled` カラムを
 * 流用する。これは initial schema 時点の `email_enabled` を migration 20260413100000
 * で `line_enabled` にリネームした歴史的経緯による命名で、企業向けにはメール送信
 * チャネルのマスターとして機能する（PR #250 コメントの方針に従って追加 migration を
 * 行わず既存カラムを流用）。
 *
 * 種別ごとの ON/OFF（`scout_accepted` 等）は **外部チャネルにのみ** 適用する。
 * アプリ内通知は履歴として常に残す方針のため、`notifications` への INSERT は
 * 設定に関わらず行う（notify.ts 参照）。
 *
 * メールアドレスの解決可否はこの関数では判定しない（resolveEmailTarget() 側で判定）。
 */
export function shouldSendEmail(
  role: NotificationRecipientRole,
  type: NotificationType,
  settings:
    | StudentNotificationSettings
    | CompanyNotificationSettings
    | null,
): boolean {
  if (role !== "company_member") return false;
  const c = settings as CompanyNotificationSettings | null;
  return isTypeEnabled(role, type, settings) && (c?.line_enabled ?? true);
}
