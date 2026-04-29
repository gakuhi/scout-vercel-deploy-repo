"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Input, FieldLabel } from "@/components/ui/input";
import { MONTHLY_SCOUT_LIMIT } from "@/features/company/app/scouts/schemas";
import type { SendScoutState } from "@/features/company/app/scouts/actions";
import type { JobPostingOption } from "@/features/company/app/scouts/queries";

type ScoutSendPageProps = {
  jobPostings: JobPostingOption[];
  sentThisMonth: number;
  action: (
    prev: SendScoutState,
    formData: FormData,
  ) => Promise<SendScoutState>;
};

const initialState: SendScoutState = {};

export function ScoutSendPage({
  jobPostings,
  sentThisMonth,
  action,
}: ScoutSendPageProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, initialState);

  // sessionStorage から学生IDリストを読み取り
  const [studentIds, setStudentIds] = useState<string[]>([]);
  useEffect(() => {
    const stored = sessionStorage.getItem("scout_student_ids");
    if (stored) {
      try {
        const ids = JSON.parse(stored) as string[];
        if (Array.isArray(ids) && ids.length > 0) {
          setStudentIds(ids);
          return;
        }
      } catch { /* ignore */ }
    }
    router.push("/company/students");
  }, [router]);
  const [showPreview, setShowPreview] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [jobPostingId, setJobPostingId] = useState(
    jobPostings[0]?.id ?? "",
  );

  const remaining = MONTHLY_SCOUT_LIMIT - sentThisMonth;

  useEffect(() => {
    if (state.success) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [state.success, router]);

  if (studentIds.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Icon name="progress_activity" className="animate-spin text-4xl text-outline" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <button
          type="button"
          onClick={() => (showPreview ? setShowPreview(false) : router.back())}
          className="flex items-center gap-1 text-xs font-bold text-outline hover:text-primary-container transition-colors mb-4"
        >
          <Icon name="arrow_back" className="text-sm" />
          {showPreview ? "スカウトを編集する" : "学生検索に戻る"}
        </button>
        <span className="text-[10px] font-bold text-tertiary-container uppercase tracking-[0.2em] mb-3 block">
          Scout Message
        </span>
        <h1 className="text-5xl font-extrabold text-primary-container leading-none tracking-tight">
          スカウト送信
        </h1>
        <p className="text-outline mt-4 font-medium">
          {studentIds.length}人の学生にスカウトメッセージを送信します。
          今月の残り送信可能数: {remaining}通
        </p>
      </div>

      {state.success && (
        <div className="mb-8 bg-green-50 text-green-700 p-4 rounded-lg text-sm font-semibold flex items-center justify-between">
          <span>
            {state.sentCount}人にスカウトを送信しました
            {(state.skippedCount ?? 0) > 0 &&
              `（${state.skippedCount}人は送信済みのためスキップ）`}
          </span>
          <button
            type="button"
            onClick={() => router.push("/company/students")}
            className="inline-flex items-center gap-1 bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Icon name="search" className="text-sm" />
            学生検索へ
          </button>
        </div>
      )}

      {state.error && !state.success && (
        <div className="mb-8 bg-error-container text-on-error-container p-4 rounded-lg text-sm font-semibold flex items-center justify-between">
          <span>{state.error}</span>
          <button
            type="button"
            onClick={() => router.push("/company/students")}
            className="text-xs font-bold underline hover:opacity-80 transition-opacity"
          >
            学生検索へ戻る
          </button>
        </div>
      )}

      {!showPreview ? (
        /* 入力フォーム */
        <div className="space-y-8">
          {/* 送信先 */}
          <div className="bg-surface-container-lowest rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="group" className="text-outline text-lg" />
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider">
                送信数
              </span>
            </div>
            <p className="text-2xl font-extrabold text-primary-container">
              {studentIds.length}人
            </p>
          </div>

          {/* 求人選択 */}
          <div className="bg-surface-container-lowest rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg signature-gradient text-white text-xs font-bold">
                01
              </span>
              <h2 className="text-lg font-bold text-primary-container">
                紐付ける求人
              </h2>
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="scout-job">求人を選択 *</FieldLabel>
              <select
                id="scout-job"
                value={jobPostingId}
                onChange={(e) => setJobPostingId(e.target.value)}
                className="w-full py-3 px-4 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
              >
                <option value="">選択してください</option>
                {jobPostings.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* メッセージ */}
          <div className="bg-surface-container-lowest rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg signature-gradient text-white text-xs font-bold">
                02
              </span>
              <h2 className="text-lg font-bold text-primary-container">
                スカウトメッセージ
              </h2>
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="scout-subject">件名 *</FieldLabel>
              <Input
                id="scout-subject"
                type="text"
                placeholder="例: 【限定】戦略コンサルタント 特別選考のご案内"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="scout-message">本文 *</FieldLabel>
              <textarea
                id="scout-message"
                rows={10}
                maxLength={5000}
                placeholder="学生に送るスカウトメッセージを入力してください"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full py-3 px-4 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all resize-y placeholder:text-outline-variant"
              />
              <p className="text-right text-[10px] text-outline">
                {message.length} / 5000
              </p>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              disabled={!subject.trim() || !message.trim() || !jobPostingId}
              className="signature-gradient text-white text-sm font-bold px-8 py-3 rounded-lg shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              プレビューを確認
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-surface-container-low text-on-surface text-sm font-bold px-8 py-3 rounded-lg hover:bg-surface-container-high transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        /* 送信プレビュー */
        <form action={formAction}>
          {studentIds.map((id) => (
            <input key={id} type="hidden" name="studentIds" value={id} />
          ))}
          <input type="hidden" name="subject" value={subject} />
          <input type="hidden" name="message" value={message} />
          <input type="hidden" name="jobPostingId" value={jobPostingId} />

          <div className="space-y-8">
            <div className="bg-surface-container-lowest rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-2 text-xs text-outline mb-4">
                <Icon name="visibility" className="text-sm" />
                送信プレビュー — 内容を確認してから送信してください
              </div>

              <div>
                <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">
                  求人
                </p>
                <p className="text-sm font-medium text-on-surface">
                  {jobPostings.find((j) => j.id === jobPostingId)?.title ??
                    "未選択"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">
                  件名
                </p>
                <p className="text-base font-bold text-primary-container">
                  {subject}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">
                  本文
                </p>
                <div className="bg-surface-container-low rounded-lg p-4">
                  <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">
                  送信先
                </p>
                <p className="text-sm font-medium text-on-surface">
                  {studentIds.length}人の学生
                </p>
              </div>
            </div>

            {studentIds.length > remaining && (
              <div className="bg-error-container text-on-error-container p-4 rounded-lg text-sm font-semibold">
                送信上限を超えています（残り{remaining}通 /{" "}
                {studentIds.length}人選択中）
              </div>
            )}

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={isPending || studentIds.length > remaining}
                onClick={(e) => {
                  if (
                    !confirm(
                      `${studentIds.length}人の学生にスカウトを送信しますか？`,
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
                className="signature-gradient text-white text-sm font-bold px-8 py-3 rounded-lg shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isPending ? "送信中..." : "送信する"}
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="bg-surface-container-low text-on-surface text-sm font-bold px-8 py-3 rounded-lg hover:bg-surface-container-high transition-colors"
              >
                戻って編集
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
