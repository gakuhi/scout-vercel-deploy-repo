"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { NotificationBell } from "@/features/student/notifications/components/notification-bell";
import { cn } from "@/shared/utils/cn";
import { STUDENT_NAV_ITEMS, resolveActiveNavKey } from "../nav-items";

export type SidebarUser = {
  imageUrl: string | null;
  name: string;
  initials: string;
  affiliation: string;
};

export function Sidebar({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: SidebarUser | null;
}) {
  const pathname = usePathname();
  const active = resolveActiveNavKey(pathname);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <nav
        className={cn(
          "fixed right-0 md:left-0 md:right-auto top-0 h-screen w-64 bg-surface border-l md:border-l-0 md:border-r border-surface-container flex flex-col pt-6 pb-24 md:pb-6 px-4 z-50 transition-transform duration-200 overflow-y-auto",
          open ? "translate-x-0" : "translate-x-full md:translate-x-0",
        )}
      >
        <div className="mb-10 px-2">
          <Link
            href="/student/dashboard"
            className="text-xl font-extrabold text-primary-container"
            onClick={onClose}
          >
            ScoutLink
          </Link>
        </div>

        <div className="space-y-2 flex-grow">
          {STUDENT_NAV_ITEMS.map((item) => {
            const isActive = item.key === active;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 font-medium",
                  isActive
                    ? "text-primary font-bold border-2 border-primary bg-surface-container"
                    : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low",
                )}
              >
                <Icon name={item.icon} filled={isActive} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="border-t border-surface-container pt-6 space-y-2">
          <div className="px-2 mb-2">
            {/* NotificationBell は内部で useSearchParams を呼ぶため、サブツリーが
                CSR バイルアウトしないよう Suspense で隔離する。fallback は静的
                ベルアイコン。 */}
            <Suspense fallback={<NotificationBellFallback />}>
              <NotificationBell />
            </Suspense>
          </div>
          {user && (
            <div className="flex items-center gap-3 px-4 mb-4">
              {user.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.imageUrl}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover bg-primary-container"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-sm font-bold text-primary">
                  {user.initials}
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-primary">{user.name}</p>
                <p className="text-[10px] text-on-surface-variant truncate">
                  {user.affiliation}
                </p>
              </div>
            </div>
          )}
          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors text-sm font-medium"
            aria-label="ヘルプ"
          >
            <Icon name="help_outline" />
            <span>ヘルプ</span>
          </button>
        </div>
      </nav>
    </>
  );
}

function NotificationBellFallback() {
  return (
    <div
      aria-hidden
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant font-medium"
    >
      <Icon name="notifications" />
      <span>通知</span>
    </div>
  );
}
