import type {
  NotificationRecipientRole,
  NotificationType,
} from "./types";

/**
 * 通知から飛ばすアクション URL を組み立てる。
 *
 * 受信者の役割 (`recipientRole`) と通知種別 (`type`) を見て、`referenceType` /
 * `referenceId` を該当ページの絶対 URL に変換する。LINE Flex Message のボタン
 * URL や、メールの CTA ボタンの href に使う。
 *
 * 既存の社内ルーティング規約:
 *
 * | role           | type                      | 行き先                                     |
 * |---             |---                        |---                                          |
 * | student        | scout_received            | /student/scout                              |
 * | student        | chat_new_message          | /student/messages                           |
 * | student        | event_reminder            | /student/events/{referenceId}               |
 * | student        | system_announcement       | /student/dashboard                          |
 * | company_member | scout_accepted / declined | /company/scouts?highlight={referenceId}     |
 * | company_member | chat_new_message          | /company/messages/{referenceId}             |
 * | company_member | event_reminder            | /company/events/{referenceId}/edit          |
 * | company_member | system_announcement       | /company/notifications                      |
 *
 * 学生側は scout / messages の詳細ページが現状無いため一覧へ送る。詳細ページが
 * 整備された段階でこのマッピングを更新する。
 *
 * `referenceId` 必須のルートで `referenceId` が無い場合は、当該役割のルート画面
 * （/student/dashboard / /company/notifications）にフォールバックする。
 *
 * NEXT_PUBLIC_BASE_URL が未設定 (= 本番ビルドの設定漏れ) の場合は null を返し、
 * 呼び出し側で「アクション URL なし」として扱えるようにする。
 */
export function buildActionUrl(input: {
  recipientRole: NotificationRecipientRole;
  type: NotificationType;
  referenceType?: string;
  referenceId?: string;
}): string | null {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) return null;
  const trimmedBase = baseUrl.replace(/\/+$/, "");

  const path = resolvePath(input);
  return `${trimmedBase}${path}`;
}

function resolvePath(input: {
  recipientRole: NotificationRecipientRole;
  type: NotificationType;
  referenceType?: string;
  referenceId?: string;
}): string {
  const { recipientRole, type, referenceId } = input;
  const homePath =
    recipientRole === "student" ? "/student/dashboard" : "/company/notifications";

  if (recipientRole === "student") {
    switch (type) {
      case "scout_received":
        return "/student/scout";
      case "chat_new_message":
        return "/student/messages";
      case "event_reminder":
        return referenceId ? `/student/events/${referenceId}` : homePath;
      case "system_announcement":
        return "/student/dashboard";
      // 学生に来ない種別は念のためダッシュボードへ
      case "scout_accepted":
      case "scout_declined":
        return homePath;
    }
  }

  switch (type) {
    case "scout_accepted":
    case "scout_declined":
      return referenceId
        ? `/company/scouts?highlight=${referenceId}`
        : homePath;
    case "chat_new_message":
      return referenceId ? `/company/messages/${referenceId}` : homePath;
    case "event_reminder":
      return referenceId
        ? `/company/events/${referenceId}/edit`
        : homePath;
    case "system_announcement":
      return "/company/notifications";
    // 企業担当者に来ない種別は念のため通知一覧へ
    case "scout_received":
      return homePath;
  }
}
