"use client";

import { useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  cancelEventRegistration,
  registerForEvent,
  type ApplyError,
  type ApplyFormInput,
} from "../actions";

export type ApplyOutcome =
  | { ok: true; status: "applied" | "already_applied" }
  | { ok: false; error: ApplyError; message?: string };

type ApplyStatusContextValue = {
  isApplied: (eventId: string) => boolean;
  /**
   * 申込を確定する。server action を呼び出し、成功時に state を更新する。
   * - 新規申込成功は `{ ok: true, status: "applied" }`
   * - 既に申込済みの場合は `{ ok: true, status: "already_applied" }`（state は同期）
   * - 締切超過 / 定員到達 / 未公開は `{ ok: false, error: ... }`
   */
  markApplied: (
    eventId: string,
    form?: ApplyFormInput,
  ) => Promise<ApplyOutcome>;
  /** 申込をキャンセル。server action を呼び出し、成功時に state を更新する。 */
  cancelApply: (
    eventId: string,
  ) => Promise<{ ok: boolean; message?: string }>;
  isPending: boolean;
};

const ApplyStatusContext = createContext<ApplyStatusContextValue | null>(null);

export function ApplyStatusProvider({
  children,
  initialAppliedIds,
}: {
  children: ReactNode;
  /** layout.tsx で server 側から取得した学生の現行申込 event_id 一覧。 */
  initialAppliedIds: string[];
}) {
  const [appliedIds, setAppliedIds] = useState<Set<string>>(
    () => new Set(initialAppliedIds),
  );
  const [isPending, startTransition] = useTransition();
  // `?mock=1` のときは未ログイン想定で server action を呼ばず、
  // ローカル state の追加 / 削除だけで申込フローを再現する。
  const searchParams = useSearchParams();
  const isMock = searchParams?.get("mock") === "1";

  const addApplied = useCallback((eventId: string) => {
    startTransition(() => {
      setAppliedIds((prev) => {
        if (prev.has(eventId)) return prev;
        const next = new Set(prev);
        next.add(eventId);
        return next;
      });
    });
  }, []);

  const removeApplied = useCallback((eventId: string) => {
    startTransition(() => {
      setAppliedIds((prev) => {
        if (!prev.has(eventId)) return prev;
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    });
  }, []);

  const markApplied = useCallback(
    async (eventId: string, form?: ApplyFormInput): Promise<ApplyOutcome> => {
      if (isMock) {
        addApplied(eventId);
        return { ok: true, status: "applied" };
      }
      const result = await registerForEvent(eventId, form);
      if (result.ok) {
        addApplied(eventId);
        return { ok: true, status: "applied" };
      }
      if (result.error === "already_applied") {
        // server 側で既に申込済みなら state を同期しつつ、UI には別ステータスで知らせる。
        addApplied(eventId);
        return { ok: true, status: "already_applied" };
      }
      return { ok: false, error: result.error, message: result.message };
    },
    [addApplied, isMock],
  );

  const cancelApply = useCallback(
    async (eventId: string): Promise<{ ok: boolean; message?: string }> => {
      if (isMock) {
        removeApplied(eventId);
        return { ok: true };
      }
      const result = await cancelEventRegistration(eventId);
      if (result.ok) {
        removeApplied(eventId);
        return { ok: true };
      }
      return { ok: false, message: result.message ?? result.error };
    },
    [isMock, removeApplied],
  );

  const value = useMemo<ApplyStatusContextValue>(
    () => ({
      isApplied: (eventId: string) => appliedIds.has(eventId),
      markApplied,
      cancelApply,
      isPending,
    }),
    [appliedIds, markApplied, cancelApply, isPending],
  );

  return (
    <ApplyStatusContext.Provider value={value}>
      {children}
    </ApplyStatusContext.Provider>
  );
}

export function useApplyStatus(): ApplyStatusContextValue {
  const ctx = useContext(ApplyStatusContext);
  if (!ctx) {
    throw new Error(
      "useApplyStatus は ApplyStatusProvider の配下で使ってください。",
    );
  }
  return ctx;
}
