"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";

/**
 * プロフィール保存完了時のトースト。
 * `?saved=1` で表示され、3 秒後に自動で消えてクエリパラメータも消去する。
 */
export function SaveToast() {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      // クエリパラメータを消去（再読込時にトーストが再表示されないように）
      router.replace("/student/profile");
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-primary-container text-white px-5 py-3 rounded-xl shadow-lg"
    >
      <Icon name="check_circle" className="text-lg" />
      <span className="text-sm font-bold">プロフィールを保存しました</span>
    </div>
  );
}
