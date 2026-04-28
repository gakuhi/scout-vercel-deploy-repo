"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import {
  ApplyDialog,
  type ApplyContext,
  type ApplyDefaults,
} from "./apply-dialog";
import { useApplyStatus } from "./apply-status";
import { CancelApplyDialog } from "./cancel-apply-dialog";
import type { ApplyError } from "../actions";

/** 申込を受付できない理由。null なら通常状態。 */
export type ApplyBlockReason = "full" | "closed" | null;

const APPLY_ERROR_MESSAGES: Record<ApplyError, string> = {
  unauthenticated: "ログインが必要です。再度ログインしてからお試しください。",
  already_applied: "すでに申込済みです。",
  event_not_found:
    "対象のイベントが見つかりませんでした。公開停止された可能性があります。",
  deadline_passed: "申込期限を過ぎたため、お申し込みいただけません。",
  capacity_full: "定員に達したため、お申し込みいただけません。",
  cancel_deadline_passed:
    "開催 24 時間前を過ぎたため、キャンセルできません。やむを得ない場合は運営にご連絡ください。",
  unknown: "申込の送信に失敗しました。時間をおいて再度お試しください。",
};

type Props = {
  context: ApplyContext;
  defaults?: ApplyDefaults;
  /** 未申込時のボタンクラス。レイアウト（サイズ・角丸など）を継承して申込済み表示にも流用する。 */
  className?: string;
  /** 定員オーバー / 締切過ぎなど、申込不可の理由。申込済みユーザーには影響させない（キャンセルはさせる）。 */
  blockReason?: ApplyBlockReason;
  /**
   * プロフィール（氏名・メール・所属）の未完了フラグ。
   * 申込ダイアログは read-only でこれらを表示するため、未完了のまま開いて
   * しまうと送信できない。`true` のときはダイアログを開かず
   * 「プロフィールを完成させる」CTA に切り替える。
   */
  profileIncomplete?: boolean;
  children: ReactNode;
};

export function ApplyButton({
  context,
  defaults,
  className,
  blockReason,
  profileIncomplete,
  children,
}: Props) {
  const [applyOpen, setApplyOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const { isApplied, markApplied, cancelApply } = useApplyStatus();
  const applied = isApplied(context.eventId);

  if (applied) {
    return (
      <>
        <button
          type="button"
          onClick={() => setCancelOpen(true)}
          className={`${className ?? ""} bg-none! bg-[#e8f5e9]! text-[#1b5e20]! inline-flex items-center justify-center gap-1.5 shadow-none! hover:bg-[#c8e6c9]! transition-colors`}
          aria-label="申込をキャンセルする"
        >
          <Icon name="check_circle" filled className="text-[18px]" />
          申し込み済み
        </button>
        <CancelApplyDialog
          open={cancelOpen}
          eventTitle={context.eventTitle}
          onClose={() => setCancelOpen(false)}
          onConfirm={async () => {
            const result = await cancelApply(context.eventId);
            if (result.ok) return { ok: true };
            // server action から返る `error` キーは ApplyError か文字列。
            // ApplyError なら定型メッセージに変換、それ以外はそのまま表示。
            const errKey = result.message as ApplyError | undefined;
            const message =
              errKey && errKey in APPLY_ERROR_MESSAGES
                ? APPLY_ERROR_MESSAGES[errKey]
                : (result.message ?? APPLY_ERROR_MESSAGES.unknown);
            return { ok: false, message };
          }}
        />
      </>
    );
  }

  if (blockReason) {
    const label =
      blockReason === "full" ? "定員に達しました" : "申込を締め切りました";
    return (
      <div
        aria-disabled
        className={`${className ?? ""} bg-none! bg-surface-variant! text-outline! shadow-none! cursor-not-allowed inline-flex items-center justify-center`}
      >
        {label}
      </div>
    );
  }

  if (profileIncomplete) {
    return (
      <Link
        href="/student/profile/edit"
        className={`${className ?? ""} inline-flex items-center justify-center gap-1.5`}
      >
        <Icon name="person_edit" className="text-[18px]" />
        プロフィールを完成させる
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setApplyOpen(true)}
      >
        {children}
      </button>
      <ApplyDialog
        open={applyOpen}
        context={context}
        defaults={defaults}
        onClose={() => setApplyOpen(false)}
        onSubmit={async (eventId, input) => {
          const outcome = await markApplied(eventId, input);
          if (outcome.ok) {
            return { ok: true, status: outcome.status };
          }
          return { ok: false, message: APPLY_ERROR_MESSAGES[outcome.error] };
        }}
      />
    </>
  );
}
