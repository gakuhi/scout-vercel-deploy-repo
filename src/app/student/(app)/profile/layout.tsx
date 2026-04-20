"use client";

import { Icon } from "@/components/ui/icon";
import { useSidebar } from "@/features/student/shell/sidebar-context";

/**
 * プロフィール画面専用レイアウト。
 * 共通シェル（サイドバー / ボトムナビ）は親 `(app)/layout.tsx` が提供する。
 * ここではプロフィール固有の「浮きハンバーガー（モバイルのみ、右寄せ）」と
 * コンテンツ幅・上パディングを管理する。
 */
export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toggle } = useSidebar();
  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className="fixed top-4 right-4 z-40 md:hidden p-2 bg-surface-container-lowest rounded-lg shadow-sm text-on-surface-variant hover:text-primary transition-colors"
        aria-label="メニューを開く"
      >
        <Icon name="menu" className="text-2xl" />
      </button>
      <div className="px-6 md:px-10 pt-10">
        <div className="max-w-6xl mx-auto">{children}</div>
      </div>
    </>
  );
}
