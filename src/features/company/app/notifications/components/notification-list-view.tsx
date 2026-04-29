"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import {
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_ICONS,
} from "@/features/company/app/notifications/schemas";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/features/company/app/notifications/actions";
import type { NotificationListItem } from "@/features/company/app/notifications/schemas";

type NotificationListViewProps = {
  notifications: NotificationListItem[];
};

type FilterTab = "all" | "unread";

export function NotificationListView({
  notifications,
}: NotificationListViewProps) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [displayCount, setDisplayCount] = useState(50);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "すべて", count: notifications.length },
    { key: "unread", label: "未読", count: unreadCount },
  ];

  async function handleMarkAllRead() {
    if (!confirm("すべての通知を既読にしますか？")) return;
    await markAllNotificationsReadAction();
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-10">
        <div>
          <span className="text-[10px] font-bold text-tertiary-container uppercase tracking-[0.2em] mb-3 block">
            Notifications
          </span>
          <h1 className="text-5xl font-extrabold text-primary-container leading-none tracking-tight">
            通知
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-bold text-outline hover:text-primary-container transition-colors"
            >
              すべて既読にする
            </button>
          )}
          <Link
            href="/company/notifications/settings"
            className="inline-flex items-center gap-1.5 bg-surface-container-low text-on-surface text-xs font-bold px-4 py-2 rounded-lg hover:bg-surface-container-high transition-colors"
          >
            <Icon name="settings" className="text-sm" />
            通知設定
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-surface-container-low rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
              filter === tab.key
                ? "bg-surface-container-lowest text-primary-container shadow-sm"
                : "text-outline hover:text-on-surface"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-[10px]">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Notification List */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-20">
          <Icon
            name="notifications_off"
            className="text-outline-variant text-5xl mb-4"
          />
          <p className="text-outline font-medium">
            {filter === "unread"
              ? "未読の通知はありません"
              : "通知はまだありません"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.slice(0, displayCount).map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
            />
          ))}
          {filteredNotifications.length > displayCount && (
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => setDisplayCount((prev) => prev + 50)}
                className="text-sm font-bold text-primary-container hover:underline transition-colors"
              >
                もっと見る（残り{filteredNotifications.length - displayCount}件）
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getNotificationLink(notification: NotificationListItem): string | null {
  if (!notification.referenceType || !notification.referenceId) return null;
  if (notification.referenceType === "scouts") {
    if (notification.type === "chat_new_message") {
      return `/company/messages/${notification.referenceId}`;
    }
    return `/company/scouts?highlight=${notification.referenceId}`;
  }
  if (notification.referenceType === "events") {
    return `/company/events/${notification.referenceId}/edit`;
  }
  return null;
}

function NotificationCard({
  notification,
}: {
  notification: NotificationListItem;
}) {
  const [isRead, setIsRead] = useState(notification.isRead);

  async function handleClick() {
    if (!isRead) {
      setIsRead(true);
      await markNotificationReadAction(notification.id);
    }
  }

  const timeAgo = notification.createdAt
    ? formatTimeAgo(new Date(notification.createdAt))
    : "";

  const link = getNotificationLink(notification);

  return (
    <div
      className={`rounded-xl p-5 transition-shadow cursor-pointer ${
        isRead
          ? "bg-surface-container-lowest"
          : "bg-surface-container-lowest ring-2 ring-primary-container/20"
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-10 h-10 rounded-full grid place-items-center shrink-0 ${
            isRead
              ? "bg-surface-container-high text-outline"
              : "signature-gradient text-white"
          }`}
        >
          <Icon
            name={NOTIFICATION_TYPE_ICONS[notification.type]}
            className="text-lg"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-sm font-bold truncate ${
                isRead ? "text-on-surface" : "text-primary-container"
              }`}
            >
              {notification.title}
            </span>
            {!isRead && (
              <span className="w-2 h-2 bg-primary-container rounded-full shrink-0" />
            )}
          </div>
          {notification.body && (
            <p className="text-xs text-outline line-clamp-2 mb-1">
              {notification.body}
            </p>
          )}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3 text-[10px] text-outline-variant">
              <span>
                {NOTIFICATION_TYPE_LABELS[notification.type]}
              </span>
              <span>{timeAgo}</span>
            </div>
            {link && (
              <Link
                href={link}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary-container hover:underline transition-colors"
              >
                詳細を見る
                <Icon name="arrow_forward" className="text-sm" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay < 7) return `${diffDay}日前`;
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
