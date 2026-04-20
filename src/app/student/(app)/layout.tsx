"use client";

import { BottomNav } from "@/features/student/shell/components/bottom-nav";
import { Sidebar } from "@/features/student/shell/components/sidebar";
import {
  SidebarProvider,
  useSidebar,
} from "@/features/student/shell/sidebar-context";

/**
 * 学生アプリ共通シェル。サイドバー + ボトムナビ + 開閉 Context のみを提供する。
 * 上部バー（TopNav / 浮きハンバーガー）はページ固有なので、ネストした layout
 * で付与する:
 *   - (with-top-nav)/layout.tsx: デフォルト TopNav + pt-24
 *   - profile/layout.tsx: 浮きハンバーガー + pt-10
 */
export default function StudentAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <Shell>{children}</Shell>
    </SidebarProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useSidebar();
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <main className="md:ml-64 pb-24 md:pb-16">{children}</main>
      <BottomNav />
    </div>
  );
}
