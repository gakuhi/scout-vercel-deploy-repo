"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { StudentProfile } from "@/features/company/student-profile/student-profile";
import type { ProfileMock } from "@/features/student/profile/mock";

type StudentDetailDrawerProps = {
  student: ProfileMock | null;
  isLoading: boolean;
  onClose: () => void;
};

export function StudentDetailDrawer({
  student,
  isLoading,
  onClose,
}: StudentDetailDrawerProps) {
  const shouldShow = isLoading || student !== null;
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  // 開く
  useEffect(() => {
    if (shouldShow) {
      setVisible(true);
      setClosing(false);
    }
  }, [shouldShow]);

  // 閉じるアニメーション後にコールバック
  function handleClose() {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      onClose();
    }, 200);
  }

  // ESCキーで閉じる
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    if (visible) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div
        className={`fixed inset-0 bg-black/30 z-50 transition-opacity duration-200 ${
          closing ? "opacity-0" : "opacity-100"
        }`}
        onClick={handleClose}
      />

      {/* ドロワー */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-3xl bg-surface z-[51] shadow-2xl overflow-y-auto transition-transform duration-200 ${
          closing ? "translate-x-full" : "animate-slide-in-right"
        }`}
      >
        {/* ヘッダー */}
        <div className="sticky top-0 bg-surface z-10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary-container">
            学生プロフィール
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-outline hover:text-primary-container transition-colors rounded-lg hover:bg-surface-container-low"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="px-6 pb-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Icon
                name="progress_activity"
                className="animate-spin text-4xl text-outline"
              />
            </div>
          ) : student ? (
            <StudentProfile data={student} hidePersonalInfo />
          ) : null}
        </div>
      </div>
    </>
  );
}
