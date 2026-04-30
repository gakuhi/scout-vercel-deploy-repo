import { getScoutInbox } from "@/features/scout/actions";
import type { ScoutItem } from "@/features/scout/schema";
import { getConversations } from "@/features/student/chat/actions";
import { formatRelative } from "@/features/student/chat/lib/format";
import type { ChatConversation } from "@/features/student/chat/schema";
import { listPublishedEvents } from "@/features/student/events/lib/queries";
import type { EventItem } from "@/features/student/events/schema";
import {
  getNotifications,
  type NotificationCategory,
  type NotificationItem,
} from "@/features/student/settings/actions";
import { createClient } from "@/lib/supabase/server";
import type {
  HomeEvent,
  HomeNotification,
  HomeNotificationKind,
  HomeScoutAlert,
  HomeUnreadMessage,
} from "../schema";

/**
 * ホーム画面の各セクションを実 DB から組み立てる。
 * - ヒーロー 3 指標 (選考中 / 未読スカウト / 未読メッセージ) は scouts と
 *   chat_messages から計算
 * - 左カラム (スカウト / 未読メッセージ / お知らせ) と右カラム (注目イベント)
 *   は上位 N 件のリストを返す
 *
 * フェッチ失敗時は呼び出し側 (page.tsx) で全体を null にして mock fallback。
 */
export type HomeQueryResult = {
  inProgressScoutCount: number;
  unreadScoutCount: number;
  unreadMessageCount: number;
  unreadNotificationCount: number;
  scoutAlerts: HomeScoutAlert[];
  unreadMessages: HomeUnreadMessage[];
  featuredEvent: HomeEvent | null;
  subEvents: HomeEvent[];
  notifications: HomeNotification[];
};

const HOME_LIST_LIMIT = 3;
const HOME_SUB_EVENTS_LIMIT = 2;

export async function getHomeData(): Promise<HomeQueryResult> {
  const supabase = await createClient();

  const [scouts, conversations, events, notifications] = await Promise.all([
    getScoutInbox().catch(() => null),
    getConversations().catch(() => [] as ChatConversation[]),
    listPublishedEvents(supabase).catch(() => [] as EventItem[]),
    getNotifications().catch(() => [] as NotificationItem[]),
  ]);

  const scoutList = scouts ?? [];
  const inProgressScoutCount = scoutList.filter(
    (s) => s.status === "accepted",
  ).length;
  const unreadScoutCount = scoutList.filter((s) => s.status === "new").length;

  const unreadMessageCount = conversations.reduce(
    (acc, c) => acc + c.unreadCount,
    0,
  );
  const unreadConversations = conversations
    .filter((c) => c.unreadCount > 0)
    .slice(0, HOME_LIST_LIMIT);

  // featured フラグ優先、なければ先頭 (listPublishedEvents は starts_at 昇順)。
  const featured = events.find((e) => e.featured) ?? events[0] ?? null;
  const subEvents = events
    .filter((e) => e.id !== featured?.id)
    .slice(0, HOME_SUB_EVENTS_LIMIT);

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  return {
    inProgressScoutCount,
    unreadScoutCount,
    unreadMessageCount,
    unreadNotificationCount,
    scoutAlerts: scoutList.slice(0, HOME_LIST_LIMIT).map(toHomeScoutAlert),
    unreadMessages: unreadConversations.map(toHomeUnreadMessage),
    featuredEvent: featured ? toHomeEvent(featured) : null,
    subEvents: subEvents.map(toHomeEvent),
    notifications: notifications
      .slice(0, HOME_LIST_LIMIT)
      .map(toHomeNotification),
  };
}

// --- mappers ---

function toHomeScoutAlert(s: ScoutItem): HomeScoutAlert {
  return {
    id: s.id,
    scoutId: s.id,
    company: s.company.name,
    message: s.message,
    icon: scoutIconForIndustry(s.company.industry),
    badge: s.isFavorite ? "★" : null,
    highlighted: s.status === "new",
    timeLabel: formatRelative(s.sentAt),
  };
}

/**
 * 業種文字列からアイコンをざっくり選ぶ。industries.ts と統合する余地あり。
 * 該当なしは中立的な "mail" にフォールバック。
 */
function scoutIconForIndustry(industry: string | null): string {
  if (!industry) return "mail";
  if (/コンサル|consult|strategy/i.test(industry)) return "business";
  if (/金融|銀行|bank|invest|fintech|finance/i.test(industry))
    return "account_balance";
  if (/IT|tech|software|ソフトウェア|エンジニア/i.test(industry))
    return "rocket_launch";
  return "mail";
}

function toHomeUnreadMessage(c: ChatConversation): HomeUnreadMessage {
  return {
    id: c.id,
    threadId: c.scoutId,
    senderName: c.company.name,
    preview: c.lastMessage.body,
    timeLabel: formatRelative(c.lastMessage.at),
  };
}

function toHomeEvent(e: EventItem): HomeEvent {
  return {
    id: e.id,
    title: e.title,
    category: e.category,
    dateLabel: e.dateLabel,
    // EventItem に description は無いので、開催形式 (locationLabel) を簡易説明として転用。
    description: e.locationLabel,
    imageUrl: e.imageUrl,
    pinLabel: e.featured ? "おすすめ" : null,
    venueLabel: e.locationLabel,
  };
}

function toHomeNotification(n: NotificationItem): HomeNotification {
  return {
    id: n.id,
    kind: toHomeNotificationKind(n.category),
    icon: notificationIcon(n.category),
    title: n.title,
    body: n.body ?? "",
    timeLabel: formatRelative(n.createdAt),
    unread: !n.isRead,
    href: notificationHref(n.category),
  };
}

function toHomeNotificationKind(c: NotificationCategory): HomeNotificationKind {
  return c === "announcement" ? "system" : c;
}

function notificationIcon(c: NotificationCategory): string {
  switch (c) {
    case "scout":
      return "mail";
    case "message":
      return "chat";
    case "event":
      return "schedule";
    case "announcement":
      return "campaign";
  }
}

function notificationHref(c: NotificationCategory): string | null {
  switch (c) {
    case "scout":
      return "/student/scout";
    case "message":
      return "/student/messages";
    case "event":
      return "/student/events";
    case "announcement":
      return null;
  }
}
