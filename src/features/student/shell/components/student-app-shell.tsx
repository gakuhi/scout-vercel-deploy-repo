"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { BottomNav } from "./bottom-nav";
import { Sidebar, type SidebarUser } from "./sidebar";
import { TopNav } from "./top-nav";

export function StudentAppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SidebarUser | null;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isProfilePage = pathname.startsWith("/student/profile");
  // プレビューは banner が top-0 に fixed で貼られるため、ハンバーガー / TopNav と
  // 位置が被る。プレビュー中は学生向けのトップボタンを隠す（PC のサイドバーは残す）
  const isPreviewPage = pathname === "/student/profile/preview";

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
      />
      {!isPreviewPage &&
        (isProfilePage ? (
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="fixed top-4 right-4 z-40 md:hidden p-2 bg-surface-container-lowest rounded-lg shadow-sm text-on-surface-variant hover:text-primary transition-colors"
            aria-label="メニューを開く"
          >
            <Icon name="menu" className="text-2xl" />
          </button>
        ) : (
          <TopNav onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
        ))}
      <main
        className={`md:ml-64 px-6 md:px-10 pb-24 md:pb-16 ${isProfilePage ? "pt-10" : "pt-24 md:pt-10"}`}
      >
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
