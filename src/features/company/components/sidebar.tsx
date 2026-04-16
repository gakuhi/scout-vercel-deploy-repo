"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/shared/utils/cn";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const navItems: NavItem[] = [
  { href: "/company/dashboard", label: "ダッシュボード", icon: "dashboard" },
  { href: "/company/jobs", label: "求人管理", icon: "work" },
  { href: "/company/students", label: "学生検索", icon: "person_search" },
  { href: "/company/scouts", label: "スカウト履歴", icon: "history_edu" },
  { href: "/company/messages", label: "メッセージ", icon: "mail" },
  { href: "/company/events", label: "イベント管理", icon: "event" },
  { href: "/company/members", label: "メンバー管理", icon: "group" },
  { href: "/company/settings", label: "企業設定", icon: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();
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
          const isActive = pathname?.startsWith(item.href) ?? false;
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
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-6 mt-auto pt-6 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary grid place-items-center text-xs font-bold">
            田
          </div>
          <div className="text-xs">
            <p className="font-bold">田中 健一</p>
            <p className="text-primary-fixed/50">採用責任者</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
