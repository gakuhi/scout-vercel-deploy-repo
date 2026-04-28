"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Icon } from "@/components/ui/icon";

type Props = {
  open: boolean;
  eventTitle: string;
  onClose: () => void;
  /**
   * キャンセル確定時に呼ぶ。サーバ側のキャンセル期限チェック等で失敗する
   * 可能性があるため、結果を返してダイアログ側でエラー表示できるようにする。
   */
  onConfirm: () => Promise<{ ok: boolean; message?: string }>;
};

type Phase =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string };

export function CancelApplyDialog({
  open,
  eventTitle,
  onClose,
  onConfirm,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setPhase({ kind: "idle" });
    } else if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleDialogMouseDown = (e: ReactMouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose();
  };

  const handleConfirm = async () => {
    setPhase({ kind: "submitting" });
    const result = await onConfirm();
    if (result.ok) {
      onClose();
    } else {
      setPhase({
        kind: "error",
        message: result.message ?? "キャンセルに失敗しました",
      });
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onMouseDown={handleDialogMouseDown}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 backdrop:bg-black/50 backdrop:backdrop-blur-sm rounded-xl p-0 w-[92vw] max-w-sm bg-surface-container-lowest text-on-surface shadow-2xl"
    >
      <div className="px-6 md:px-8 pt-7 pb-6 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-error-container text-on-error-container grid place-items-center">
          <Icon name="event_busy" className="text-2xl" />
        </div>
        <h2 className="text-base md:text-lg font-bold mb-2">
          申込をキャンセルしますか？
        </h2>
        <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed line-clamp-3">
          {eventTitle}
        </p>
        {phase.kind === "error" && (
          <p
            role="alert"
            className="mt-4 text-xs text-error font-semibold leading-relaxed"
          >
            {phase.message}
          </p>
        )}
      </div>
      <footer className="px-6 md:px-8 py-4 border-t border-outline-variant/30 flex gap-3 justify-end bg-surface-container-low">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 text-sm font-bold text-on-surface-variant hover:text-primary"
        >
          戻る
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={phase.kind === "submitting"}
          className="bg-error text-on-error px-6 py-2.5 rounded-lg font-bold text-sm active:scale-95 hover:opacity-90 transition-all disabled:opacity-50"
        >
          {phase.kind === "submitting" ? "送信中…" : "キャンセルする"}
        </button>
      </footer>
    </dialog>
  );
}
