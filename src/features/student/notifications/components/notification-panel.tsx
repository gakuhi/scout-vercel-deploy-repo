"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  getNotifications,
  markAllNotificationsAsRead,
  sendTestNotification,
  type NotificationCategory,
  type NotificationItem,
} from "@/features/student/settings/actions";
import { cn } from "@/shared/utils/cn";

type FilterKey = "all" | NotificationCategory;

const FILTERS: ReadonlyArray<{ key: FilterKey; label: string; icon?: string }> = [
  { key: "all", label: "全て" },
  { key: "scout", label: "スカウト", icon: "campaign" },
  { key: "message", label: "メッセージ", icon: "chat" },
  { key: "event", label: "イベント", icon: "event_note" },
  { key: "announcement", label: "お知らせ", icon: "info" },
];

const IS_DEV = process.env.NODE_ENV === "development";

type Props = {
  notifications: NotificationItem[];
  setNotifications: (next: NotificationItem[]) => void;
  isMock: boolean;
  onClose: () => void;
};

export function NotificationPanel({
  notifications,
  setNotifications,
  isMock,
  onClose,
}: Props) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [isPending, startTransition] = useTransition();
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { all: 0, scout: 0, message: 0, event: 0, announcement: 0 };
    for (const n of notifications) {
      if (!n.isRead) {
        c.all += 1;
        c[n.category] += 1;
      }
    }
    return c;
  }, [notifications]);

  const visible = useMemo(
    () =>
      filter === "all"
        ? notifications
        : notifications.filter((n) => n.category === filter),
    [filter, notifications],
  );

  const hasUnread = counts.all > 0;

  const handleMarkAllAsRead = () => {
    setNotifications(
      notifications.map((n) => (n.isRead ? n : { ...n, isRead: true })),
    );
    if (isMock) return;
    startTransition(async () => {
      await markAllNotificationsAsRead();
    });
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestError(null);
    const res = await sendTestNotification();
    if (res.error) {
      setTestError(res.error);
    } else if (!isMock) {
      const fresh = await getNotifications();
      setNotifications(fresh);
    }
    setIsTesting(false);
  };

  return (
    <section className="bg-surface-container-lowest rounded-xl shadow-xl flex flex-col max-h-[min(40rem,calc(100vh-5rem))]">
      <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-surface-container">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Icon name="notifications" className="text-primary-container" />
            <h2 className="text-lg font-bold text-on-surface">通知一覧</h2>
          </div>
          <p className="text-xs text-outline">
            {hasUnread
              ? `未読 ${counts.all} 件`
              : "すべての通知を確認済みです"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 -m-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
          aria-label="閉じる"
        >
          <Icon name="close" />
        </button>
      </header>

      <div className="px-6 pt-4">
        <div className="flex flex-wrap gap-1.5 mb-4 md:flex-nowrap md:overflow-x-auto">
          {FILTERS.map((f) => (
            <FilterPill
              key={f.key}
              filter={f}
              active={filter === f.key}
              unreadCount={counts[f.key]}
              onClick={() => setFilter(f.key)}
            />
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={!hasUnread || isPending}
          >
            <Icon name="done_all" className="text-base" />
            <span>{isPending ? "処理中..." : "すべて既読にする"}</span>
          </Button>
          {IS_DEV && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isTesting}
              onClick={handleTest}
              className="text-outline"
            >
              <Icon name="science" className="text-base" />
              <span>{isTesting ? "送信中..." : "テスト通知"}</span>
            </Button>
          )}
        </div>
        {IS_DEV && testError && (
          <p className="text-xs text-error mb-2 font-semibold">{testError}</p>
        )}
      </div>

      <div className="px-6 pb-6 flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <ul className="space-y-3">
            {visible.map((n) => (
              <li key={n.id}>
                <NotificationRow notification={n} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function FilterPill({
  filter,
  active,
  unreadCount,
  onClick,
}: {
  filter: { key: FilterKey; label: string; icon?: string };
  active: boolean;
  unreadCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-container text-white text-xs font-bold transition-colors"
          : "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface-variant text-xs font-semibold hover:bg-surface-container-high transition-colors"
      }
    >
      {filter.icon && <Icon name={filter.icon} className="text-base" />}
      <span>{filter.label}</span>
      {unreadCount > 0 && (
        <span
          className={
            active
              ? "bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-bold"
              : "bg-tertiary-fixed text-tertiary-container text-[10px] px-2 py-0.5 rounded-full font-bold"
          }
        >
          {unreadCount}
        </span>
      )}
    </button>
  );
}

function NotificationRow({
  notification,
}: {
  notification: NotificationItem;
}) {
  const style = visualForCategory(notification.category);
  const { isRead } = notification;

  return (
    <article
      className={cn(
        "relative flex items-start gap-4 p-4 rounded-xl",
        isRead
          ? "bg-surface-container-low opacity-75 hover:opacity-100 transition-opacity"
          : `bg-surface-container-lowest border-l-4 ${style.borderClass} shadow-sm hover:shadow-md transition-shadow`,
      )}
    >
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          isRead ? "bg-surface-container text-outline" : style.iconBgClass
        }`}
      >
        <Icon name={style.icon} filled={!isRead} className="text-lg" />
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3
              className={
                isRead
                  ? "text-sm font-semibold text-on-surface-variant truncate"
                  : "text-sm font-bold text-primary truncate"
              }
            >
              {notification.title}
            </h3>
            {!isRead && (
              <span className="bg-tertiary-fixed text-tertiary-container text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                New
              </span>
            )}
          </div>
          <time className="text-[11px] text-outline shrink-0">
            {formatRelative(notification.createdAt)}
          </time>
        </div>
        {notification.body && (
          <p
            className={
              isRead
                ? "text-xs text-on-surface-variant leading-relaxed line-clamp-2"
                : "text-xs text-on-surface leading-relaxed line-clamp-2"
            }
          >
            {notification.body}
          </p>
        )}
      </div>
    </article>
  );
}

function EmptyState({ filter }: { filter: FilterKey }) {
  const label = FILTERS.find((f) => f.key === filter)?.label ?? "";
  return (
    <div className="py-16 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center mb-3">
        <Icon name="notifications_off" className="text-outline text-2xl" />
      </div>
      <p className="text-sm font-bold text-on-surface">
        {filter === "all"
          ? "通知はまだありません"
          : `「${label}」の通知はありません`}
      </p>
      <p className="text-xs text-outline mt-1">
        新しい通知が届くとここに表示されます。
      </p>
    </div>
  );
}

function visualForCategory(category: NotificationCategory): {
  icon: string;
  borderClass: string;
  iconBgClass: string;
} {
  switch (category) {
    case "scout":
      return {
        icon: "campaign",
        borderClass: "border-tertiary-container",
        iconBgClass: "bg-tertiary-fixed text-tertiary-container",
      };
    case "message":
      return {
        icon: "chat",
        borderClass: "border-on-secondary-container",
        iconBgClass: "bg-secondary-fixed text-on-secondary-container",
      };
    case "event":
      return {
        icon: "event_available",
        borderClass: "border-primary",
        iconBgClass: "bg-primary-fixed text-primary",
      };
    case "announcement":
      return {
        icon: "verified_user",
        borderClass: "border-outline",
        iconBgClass: "bg-surface-container text-on-surface-variant",
      };
  }
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間前`;
  const day = Math.floor(hour / 24);
  if (day < 2) return "昨日";
  if (day < 7) return `${day}日前`;
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
