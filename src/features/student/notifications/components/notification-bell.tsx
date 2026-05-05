"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import {
  getNotifications,
  type NotificationItem,
} from "@/features/student/settings/actions";
import { MOCK_NOTIFICATIONS } from "@/features/student/settings/mock-notifications";
import { cn } from "@/shared/utils/cn";
import { NotificationPanel } from "./notification-panel";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const search = useSearchParams();
  const isMock = search?.get("mock") === "1";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isMock) {
      setItems(MOCK_NOTIFICATIONS);
      return;
    }
    let active = true;
    (async () => {
      const fresh = await getNotifications();
      if (active) setItems(fresh);
    })();
    return () => {
      active = false;
    };
  }, [isMock]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.isRead).length,
    [items],
  );

  const handleToggle = () => {
    setOpen((v) => {
      const next = !v;
      if (next && !isMock) {
        void (async () => {
          const fresh = await getNotifications();
          setItems(fresh);
        })();
      }
      return next;
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-label="通知を開く"
        className={cn(
          "w-full flex items-center gap-3 px-4 py-4 md:py-3 rounded-xl transition-colors duration-200 font-medium text-base md:text-sm",
          open
            ? "text-primary font-bold border-2 border-primary bg-surface-container"
            : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low",
        )}
      >
        <span className="relative inline-flex">
          <Icon
            name="notifications"
            filled={open}
            className="text-2xl md:text-xl"
          />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-tertiary-container text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
        <span>通知</span>
      </button>

      {open && mounted &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-60"
              onClick={() => setOpen(false)}
            />
            <div className="fixed z-70 left-4 right-4 top-1/2 -translate-y-1/2 md:left-72 md:top-6 md:translate-y-0 md:right-auto md:w-lg">
              <NotificationPanel
                notifications={items}
                setNotifications={setItems}
                isMock={isMock}
                onClose={() => setOpen(false)}
              />
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
