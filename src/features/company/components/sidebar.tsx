"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/shared/utils/cn";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: "unread";
};

const navItems: NavItem[] = [
  { href: "/company/dashboard", label: "ダッシュボード", icon: "dashboard" },
  { href: "/company/jobs", label: "求人管理", icon: "work" },
  { href: "/company/students", label: "スカウト送付", icon: "person_search" },
  { href: "/company/scouts", label: "スカウト履歴", icon: "history_edu" },
  { href: "/company/messages", label: "メッセージ", icon: "mail" },
  { href: "/company/events", label: "イベント管理", icon: "event" },
  { href: "/company/members", label: "メンバー管理", icon: "group" },
  {
    href: "/company/notifications",
    label: "通知",
    icon: "notifications",
    badge: "unread",
  },
  {
    href: "/company/notifications/settings",
    label: "通知設定",
    icon: "tune",
  },
  { href: "/company/settings", label: "企業プロフィール", icon: "corporate_fare" },
];

const roleLabels: Record<string, string> = {
  owner: "オーナー",
  admin: "管理者",
  member: "メンバー",
};

export type SidebarUser = {
  name: string;
  role: string;
};

function formatUnreadBadge(count: number): string {
  if (count >= 10) return "9+";
  return String(count);
}

export function Sidebar({
  user,
  unreadCount = 0,
}: {
  user?: SidebarUser;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const displayName = user?.name || "ユーザー";
  const displayRole = user?.role ? (roleLabels[user.role] ?? user.role) : "";
  const initial = displayName.charAt(0);

  return (
    <aside className="bg-primary-container text-white h-screen w-64 fixed left-0 top-0 shadow-2xl flex flex-col py-6 z-50">
      <div className="px-6 mb-8">
        <h1 className="text-xl font-extrabold text-white tracking-tighter">
          Recruitment Authority
        </h1>
        <p className="text-xs text-primary-fixed/50 uppercase tracking-[0.2em] mt-1">
          Executive Portal
        </p>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isScoutNew = pathname?.startsWith("/company/scouts/new") ?? false;
          const isNotificationsRoot = item.href === "/company/notifications";
          const isSettings = item.href === "/company/notifications/settings";
          const isActive = isScoutNew
            ? item.href === "/company/students"
            : isNotificationsRoot
              ? pathname === "/company/notifications"
              : isSettings
                ? pathname?.startsWith("/company/notifications/settings") ?? false
                : (pathname?.startsWith(item.href) ?? false);

          const showBadge = item.badge === "unread" && unreadCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mx-2 px-4 py-3 flex items-center gap-3 rounded-lg transition-colors text-sm",
                isActive
                  ? "bg-white/10 text-white font-bold"
                  : "text-primary-fixed/70 hover:text-white hover:bg-white/5",
              )}
            >
              <Icon name={item.icon} />
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <span className="bg-error text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1.5 grid place-items-center">
                  {formatUnreadBadge(unreadCount)}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 mt-auto pt-6 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary grid place-items-center text-xs font-bold">
            {initial}
          </div>
          <div className="text-xs">
            <p className="font-bold">{displayName}</p>
            {displayRole && (
              <p className="text-primary-fixed/50">{displayRole}</p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
