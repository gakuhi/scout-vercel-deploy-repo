"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/shared/utils/cn";
import { STUDENT_NAV_ITEMS, resolveActiveNavKey } from "../nav-items";

export function BottomNav() {
  const pathname = usePathname();
  const active = resolveActiveNavKey(pathname);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full h-20 glass-panel flex justify-around items-center px-4 pb-[env(safe-area-inset-bottom)] border-t border-outline-variant/30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-50 rounded-t-xl">
      {STUDENT_NAV_ITEMS.filter((item) => item.showOnMobile !== false).map((item) => {
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center transition-transform",
              isActive ? "text-primary scale-110" : "text-outline opacity-70",
            )}
          >
            <Icon name={item.icon} filled={isActive} />
            <span className="text-[10px] font-medium uppercase tracking-wider">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
