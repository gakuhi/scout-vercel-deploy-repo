"use client";

import { TopNav } from "@/features/student/shell/components/top-nav";
import { useSidebar } from "@/features/student/shell/sidebar-context";

/**
 * 通常ページ向け layout。モバイル上部 TopNav（ハンバーガー右寄せ）を表示し、
 * main の上パディングを pt-24 にする。開閉状態は SidebarProvider 経由。
 */
export default function WithTopNavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toggle } = useSidebar();
  return (
    <>
      <TopNav onMenuToggle={toggle} />
      <div className="px-6 md:px-10 pt-24 md:pt-10">
        <div className="max-w-6xl mx-auto">{children}</div>
      </div>
    </>
  );
}
