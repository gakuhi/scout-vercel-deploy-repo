import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Eyebrow } from "@/components/ui/tag";
import { cn } from "@/shared/utils/cn";
import { HERO_BACKGROUND_URL } from "../mock";
import type {
  HomeData,
  HomeEvent,
  HomeJournalArticle,
  HomeNotification,
  HomeProfileCompletion,
  HomeScoutAlert,
  HomeUnreadMessage,
} from "../schema";

type Props = {
  data: HomeData;
};

export function HomeView({ data }: Props) {
  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      <Hero
        userName={data.userName}
        inProgressScoutCount={data.inProgressScoutCount}
        unreadScoutCount={data.newScoutCount}
        unreadMessageCount={data.unreadMessageCount}
      />
      {data.profileCompletion && (
        <ProfileCompletionBanner completion={data.profileCompletion} />
      )}
      <div className="grid grid-cols-12 gap-6 md:gap-8">
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 md:gap-8">
          <ScoutAlertsCard
            alerts={data.scoutAlerts}
            newCount={data.newScoutCount}
          />
          <UnreadMessagesCard
            messages={data.unreadMessages}
            unreadCount={data.unreadMessageCount}
          />
          <NotificationsCard
            notifications={data.notifications}
            unreadCount={data.unreadNotificationCount}
          />
        </div>
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <EventsSection
            featured={data.featuredEvent}
            subEvents={data.subEvents}
          />
          <JournalSection articles={data.journal} />
        </div>
      </div>
    </div>
  );
}

function ProfileCompletionBanner({
  completion,
}: {
  completion: HomeProfileCompletion;
}) {
  const percent = Math.max(0, Math.min(100, completion.percent));
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
      <div className="flex items-center gap-4 md:gap-5 min-w-0 flex-1">
        <CircleProgress percent={percent} />
        <div className="min-w-0">
          <p className="text-xs text-outline font-medium mb-0.5">
            プロフィール完成度
          </p>
          <h3 className="text-base md:text-lg font-bold text-primary mb-1">
            あと {Math.max(0, 100 - percent)}% で公開準備完了
          </h3>
          {completion.missingFields.length > 0 && (
            <p className="text-xs md:text-sm text-on-surface-variant truncate">
              未入力: {completion.missingFields.join(" / ")}
            </p>
          )}
        </div>
      </div>
      <Link
        href="/student/profile/edit"
        className="bg-primary-container text-white px-5 py-2.5 rounded-lg font-bold inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shrink-0"
      >
        編集に進む
        <Icon name="arrow_forward" className="text-base" />
      </Link>
    </div>
  );
}

function CircleProgress({ percent }: { percent: number }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
        <circle
          cx="28"
          cy="28"
          r={radius}
          className="fill-none stroke-surface-container"
          strokeWidth="5"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          className="fill-none stroke-primary-container transition-[stroke-dashoffset] duration-700"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xs font-bold text-primary">
        {percent}%
      </span>
    </div>
  );
}

function Hero({
  userName,
  inProgressScoutCount,
  unreadScoutCount,
  unreadMessageCount,
}: {
  userName: string;
  inProgressScoutCount: number;
  unreadScoutCount: number;
  unreadMessageCount: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl px-6 py-10 md:px-10 md:py-12">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_BACKGROUND_URL}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/60 to-primary/30" />
      <div className="relative space-y-8">
        <div>
          <Eyebrow className="mb-2 text-white/80">Welcome Back</Eyebrow>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight tracking-tight drop-shadow">
            {userName} さん、
            <br />
            おかえりなさい
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <StatCard
            icon="trending_up"
            label="選考中"
            value={inProgressScoutCount}
            unit="件"
            href="/student/scout?filter=accepted"
          />
          <StatCard
            icon="mark_email_unread"
            label="未読スカウト"
            value={unreadScoutCount}
            unit="件"
            href="/student/scout?filter=unread"
          />
          <StatCard
            icon="forum"
            label="未読メッセージ"
            value={unreadMessageCount}
            unit="件"
            href="/student/messages"
          />
        </div>
      </div>
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
  href,
}: {
  icon: string;
  label: string;
  value: number;
  unit: string;
  href: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="p-4 md:p-5 hover:shadow-md transition-shadow flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name={icon} className="text-primary-container text-2xl" />
          <span className="text-base md:text-lg font-bold text-primary truncate">
            {label}
          </span>
        </div>
        <p className="text-2xl md:text-3xl font-extrabold text-primary shrink-0">
          {value.toLocaleString()}
          <span className="text-xs ml-1 font-bold text-on-surface-variant">
            {unit}
          </span>
        </p>
      </Card>
    </Link>
  );
}

function ScoutAlertsCard({
  alerts,
  newCount,
}: {
  alerts: HomeScoutAlert[];
  newCount: number;
}) {
  return (
    <div className="bg-surface-container-lowest p-6 md:p-8 rounded-xl shadow-sm flex flex-col">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-lg md:text-xl font-bold text-primary tracking-tight">
          スカウト
        </h2>
        {newCount > 0 && (
          <span className="text-xs text-outline font-medium">
            {newCount} 件の新規
          </span>
        )}
      </div>
      {alerts.length === 0 ? (
        <div className="py-10 grid place-items-center text-center flex-1">
          <div>
            <Icon
              name="inbox"
              className="text-outline text-3xl mb-2 block"
            />
            <p className="text-sm text-on-surface-variant font-semibold">
              新しいスカウトはまだありません
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 flex-1">
          {alerts.map((a) => (
            <ScoutAlertRow key={a.id} alert={a} />
          ))}
        </div>
      )}
      <Link
        href="/student/scout"
        className="mt-6 inline-flex items-center justify-center w-full py-3 text-sm font-bold text-primary-container bg-surface-container border border-outline-variant/30 rounded-lg hover:bg-surface-container-high transition-colors"
      >
        すべてのスカウトを確認
      </Link>
    </div>
  );
}

function UnreadMessagesCard({
  messages,
  unreadCount,
}: {
  messages: HomeUnreadMessage[];
  unreadCount: number;
}) {
  return (
    <div className="bg-surface-container-lowest p-6 md:p-8 rounded-xl shadow-sm flex flex-col">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-lg md:text-xl font-bold text-primary tracking-tight">
          未読メッセージ
        </h2>
        {unreadCount > 0 && (
          <span className="text-xs text-outline font-medium">
            {unreadCount} 件の未読
          </span>
        )}
      </div>
      {messages.length === 0 ? (
        <div className="py-10 grid place-items-center text-center flex-1">
          <div>
            <Icon
              name="forum"
              className="text-outline text-3xl mb-2 block"
            />
            <p className="text-sm text-on-surface-variant font-semibold">
              未読メッセージはありません
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 flex-1">
          {messages.map((m) => (
            <UnreadMessageRow key={m.id} message={m} />
          ))}
        </div>
      )}
      <Link
        href="/student/messages"
        className="mt-6 inline-flex items-center justify-center w-full py-3 text-sm font-bold text-primary-container bg-surface-container border border-outline-variant/30 rounded-lg hover:bg-surface-container-high transition-colors"
      >
        メッセージをすべて見る
      </Link>
    </div>
  );
}

function UnreadMessageRow({ message }: { message: HomeUnreadMessage }) {
  return (
    <Link
      href={`/student/messages?id=${message.threadId}`}
      className="flex items-start gap-3 p-3 rounded-lg transition-colors group hover:bg-surface-container-low"
    >
      <div className="w-11 h-11 shrink-0 bg-surface-container grid place-items-center rounded-lg text-primary-container">
        <Icon name="chat_bubble" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold truncate group-hover:text-primary-container transition-colors mb-0.5">
          {message.senderName}
        </h3>
        <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2 mb-1">
          {message.preview}
        </p>
        <p className="text-[10px] text-outline">{message.timeLabel}</p>
      </div>
    </Link>
  );
}

function NotificationsCard({
  notifications,
  unreadCount,
}: {
  notifications: HomeNotification[];
  unreadCount: number;
}) {
  return (
    <div className="bg-surface-container-lowest p-6 md:p-8 rounded-xl shadow-sm flex flex-col">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-lg md:text-xl font-bold text-primary tracking-tight">
          お知らせ
        </h2>
        {unreadCount > 0 && (
          <span className="text-xs text-outline font-medium">
            {unreadCount} 件の未読
          </span>
        )}
      </div>
      {notifications.length === 0 ? (
        <div className="py-10 grid place-items-center text-center flex-1">
          <div>
            <Icon
              name="notifications_off"
              className="text-outline text-3xl mb-2 block"
            />
            <p className="text-sm text-on-surface-variant font-semibold">
              お知らせはありません
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 flex-1">
          {notifications.map((n) => (
            <NotificationRow key={n.id} notification={n} />
          ))}
        </div>
      )}
      <Link
        href="/student/notifications"
        className="mt-6 inline-flex items-center justify-center w-full py-3 text-sm font-bold text-primary-container bg-surface-container border border-outline-variant/30 rounded-lg hover:bg-surface-container-high transition-colors"
      >
        すべての通知を見る
      </Link>
    </div>
  );
}

function NotificationRow({ notification }: { notification: HomeNotification }) {
  const className =
    "flex items-start gap-3 p-3 rounded-lg transition-colors group hover:bg-surface-container-low";
  const inner = (
    <>
      <div className="w-11 h-11 shrink-0 bg-surface-container grid place-items-center rounded-lg text-primary-container">
        <Icon name={notification.icon} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold truncate group-hover:text-primary-container transition-colors mb-0.5">
          {notification.title}
        </h3>
        <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2 mb-1">
          {notification.body}
        </p>
        <p className="text-[10px] text-outline">{notification.timeLabel}</p>
      </div>
    </>
  );
  if (notification.href) {
    return (
      <Link href={notification.href} className={className}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}

function ScoutAlertRow({ alert }: { alert: HomeScoutAlert }) {
  return (
    <Link
      href={`/student/scout?id=${alert.scoutId}`}
      className="flex items-start gap-3 p-3 rounded-lg transition-colors group hover:bg-surface-container-low"
    >
      <div className="w-11 h-11 shrink-0 bg-surface-container grid place-items-center rounded-lg text-primary-container">
        <Icon name={alert.icon} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <h3 className="text-sm font-bold truncate group-hover:text-primary-container transition-colors">
            {alert.company}
          </h3>
          {alert.badge && (
            <span className="text-[10px] text-tertiary-container bg-tertiary-fixed px-2 py-0.5 rounded font-bold shrink-0">
              {alert.badge}
            </span>
          )}
        </div>
        <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2 mb-1">
          {alert.message}
        </p>
        <p className="text-[10px] text-outline">{alert.timeLabel}</p>
      </div>
    </Link>
  );
}

function EventsSection({
  featured,
  subEvents,
}: {
  featured: HomeEvent | null;
  subEvents: HomeEvent[];
}) {
  const hasAny = featured !== null || subEvents.length > 0;
  return (
    <section>
      <div className="flex justify-between items-end px-1 mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-primary tracking-tight">
            注目イベント
          </h2>
          <p className="text-xs md:text-sm text-outline">
            厳選されたキャリアアップの機会
          </p>
        </div>
        <Link
          href="/student/events"
          className="text-xs md:text-sm font-bold text-primary-container inline-flex items-center gap-1 hover:underline"
        >
          すべて見る
          <Icon name="chevron_right" className="text-sm" />
        </Link>
      </div>
      {!hasAny ? (
        <div className="bg-surface-container-lowest rounded-xl p-10 text-center">
          <Icon name="event_busy" className="text-outline text-3xl mb-2 block" />
          <p className="text-sm text-on-surface-variant font-semibold">
            現在開催予定のイベントはありません
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          {featured && (
            <div className="col-span-2 md:col-span-1">
              <FeaturedEventCard event={featured} />
            </div>
          )}
          {subEvents.length > 0 && (
            <div
              className={cn(
                "col-span-2 grid gap-4 md:gap-6",
                featured ? "md:col-span-1 grid-rows-2" : "md:grid-cols-2",
              )}
            >
              {subEvents.map((e) => (
                <SubEventCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function FeaturedEventCard({ event }: { event: HomeEvent }) {
  return (
    <Link
      href={`/student/events/${event.id}`}
      className="block bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm group"
    >
      <div className="relative h-44 md:h-48 overflow-hidden bg-surface-container">
        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt=""
            aria-hidden
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
        {event.pinLabel && (
          <div className="absolute top-3 left-3 bg-primary-container text-white px-3 py-1 rounded text-[10px] font-bold">
            {event.pinLabel}
          </div>
        )}
      </div>
      <div className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold text-outline uppercase tracking-wider">
            {event.category}
          </span>
          <span className="w-1 h-1 bg-outline rounded-full" />
          <span className="text-[10px] font-medium text-outline">
            {event.dateLabel}
          </span>
        </div>
        <h3 className="text-base md:text-lg font-bold text-primary leading-snug mb-2">
          {event.title}
        </h3>
        <p className="text-xs md:text-sm text-on-surface-variant line-clamp-2">
          {event.description}
        </p>
      </div>
    </Link>
  );
}

function SubEventCard({ event }: { event: HomeEvent }) {
  return (
    <Link
      href={`/student/events/${event.id}`}
      className="bg-surface-container-lowest p-4 md:p-5 rounded-xl flex gap-4 shadow-sm group hover:bg-surface-bright transition-colors"
    >
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden shrink-0 bg-surface-container">
        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt=""
            aria-hidden
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[10px] font-bold text-secondary tracking-widest uppercase mb-1 block">
          {event.category}
        </span>
        <h4 className="text-sm font-bold text-primary mb-1 line-clamp-2 group-hover:text-primary-container transition-colors">
          {event.title}
        </h4>
        {event.venueLabel && (
          <p className="text-xs text-outline">{event.venueLabel}</p>
        )}
      </div>
    </Link>
  );
}

function JournalSection({ articles }: { articles: HomeJournalArticle[] }) {
  if (articles.length === 0) return null;
  return (
    <section className="bg-surface-container-low rounded-xl p-6 md:p-8">
      <h2 className="text-lg md:text-xl font-bold text-primary mb-5 flex items-center gap-2">
        <Icon name="article" className="text-primary-container" />
        キャリア・ジャーナル
      </h2>
      <div>
        {articles.map((a, i) => {
          const isExternal = Boolean(a.externalUrl);
          const href = a.externalUrl ?? `/student/journal/${a.id}`;
          const className = cn(
            "flex items-center justify-between group py-4",
            i < articles.length - 1 && "border-b border-outline-variant/30",
          );
          const inner = (
            <>
              <div className="flex-1 pr-4 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-outline">
                    {a.dateLabel}
                  </span>
                  {a.sourceLabel && (
                    <span className="text-[10px] text-outline-variant">
                      ・{a.sourceLabel}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-on-surface group-hover:text-primary-container transition-colors line-clamp-2">
                  {a.title}
                </h3>
              </div>
              <Icon
                name={isExternal ? "open_in_new" : "arrow_forward"}
                className="text-outline group-hover:translate-x-1 group-hover:text-primary-container transition-all shrink-0"
              />
            </>
          );
          return isExternal ? (
            <a
              key={a.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
            >
              {inner}
            </a>
          ) : (
            <Link key={a.id} href={href} className={className}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
