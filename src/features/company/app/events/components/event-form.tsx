"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Input, FieldLabel } from "@/components/ui/input";
import {
  EVENT_TYPES,
  EVENT_FORMATS,
  EVENT_FORMAT_LABELS,
} from "@/features/company/app/events/schemas";
import type { SaveEventState } from "@/features/company/app/events/actions/save";
import type { EventDetail } from "@/features/company/app/events/queries";

type EventFormProps = {
  event?: EventDetail;
  action: (
    prev: SaveEventState,
    formData: FormData,
  ) => Promise<SaveEventState>;
};

const initialState: SaveEventState = {};

function toDatetimeLocal(isoString: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateValue(isoString: string | null): string {
  if (!isoString) return "";
  return isoString.slice(0, 10);
}

export function EventForm({ event, action }: EventFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success && state.eventId) {
      router.push("/company/events");
    }
  }, [state.success, state.eventId, router]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-xs font-bold text-outline hover:text-primary-container transition-colors mb-4"
        >
          <Icon name="arrow_back" className="text-sm" />
          イベント一覧に戻る
        </button>
        <span className="text-[10px] font-bold text-tertiary-container uppercase tracking-[0.2em] mb-3 block">
          {event ? "Edit Event" : "Create New Event"}
        </span>
        <h1 className="text-5xl font-extrabold text-primary-container leading-none tracking-tight">
          {event ? "イベント編集" : "新規イベント作成"}
        </h1>
        <p className="text-outline mt-4 font-medium">
          イベント情報を入力しましょう。下書き保存も可能です。
        </p>
      </div>

      {state.error && (
        <div className="mb-8 bg-error-container text-on-error-container p-4 rounded-lg text-sm font-semibold">
          {state.error}
        </div>
      )}

      <form action={formAction}>
        {event && <input type="hidden" name="eventId" value={event.id} />}

        <div className="space-y-10">
          {/* Section 01: 基本情報 */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg signature-gradient text-white text-xs font-bold">
                01
              </span>
              <h2 className="text-lg font-bold text-primary-container">
                基本情報
              </h2>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-6 space-y-5">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="event-title">イベント名 *</FieldLabel>
                <Input
                  id="event-title"
                  name="title"
                  type="text"
                  placeholder="例: 2025年度 事業戦略合同説明会"
                  defaultValue={event?.title ?? ""}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="event-type">カテゴリ</FieldLabel>
                  <select
                    id="event-type"
                    name="eventType"
                    defaultValue={event?.eventType ?? ""}
                    className="w-full py-3 px-4 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
                  >
                    <option value="">選択してください</option>
                    {EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="event-format">開催形式 *</FieldLabel>
                  <select
                    id="event-format"
                    name="format"
                    defaultValue={event?.format ?? "offline"}
                    className="w-full py-3 px-4 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
                  >
                    {EVENT_FORMATS.map((fmt) => (
                      <option key={fmt} value={fmt}>
                        {EVENT_FORMAT_LABELS[fmt]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Section 02: 開催スケジュール */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg signature-gradient text-white text-xs font-bold">
                02
              </span>
              <h2 className="text-lg font-bold text-primary-container">
                開催スケジュール
              </h2>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="starts-at">開始日時 *</FieldLabel>
                  <input
                    id="starts-at"
                    name="startsAt"
                    type="datetime-local"
                    defaultValue={toDatetimeLocal(event?.startsAt ?? null)}
                    required
                    className="w-full py-3 px-4 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="ends-at">終了日時</FieldLabel>
                  <input
                    id="ends-at"
                    name="endsAt"
                    type="datetime-local"
                    defaultValue={toDatetimeLocal(event?.endsAt ?? null)}
                    className="w-full py-3 px-4 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <FieldLabel htmlFor="application-deadline">
                  応募締切日
                </FieldLabel>
                <input
                  id="application-deadline"
                  name="applicationDeadline"
                  type="date"
                  defaultValue={toDateValue(
                    event?.applicationDeadline ?? null,
                  )}
                  className="w-full py-3 px-4 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="capacity">定員</FieldLabel>
                  <Input
                    id="capacity"
                    name="capacity"
                    type="number"
                    placeholder="数字を入力してください"
                    defaultValue={event?.capacity ?? ""}
                    min={1}
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="target-graduation-year">
                    対象卒業年度
                  </FieldLabel>
                  <select
                    id="target-graduation-year"
                    name="targetGraduationYear"
                    defaultValue={
                      event?.targetGraduationYear ??
                      new Date().getFullYear() + 2
                    }
                    className="w-full py-3 px-4 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
                  >
                    {Array.from(
                      { length: 7 },
                      (_, i) => new Date().getFullYear() + i,
                    ).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Section 03: 場所・詳細 */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg signature-gradient text-white text-xs font-bold">
                03
              </span>
              <h2 className="text-lg font-bold text-primary-container">
                場所・詳細
              </h2>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="location">会場</FieldLabel>
                  <Input
                    id="location"
                    name="location"
                    type="text"
                    placeholder="例: 東京都新宿区西新宿1-1-1"
                    defaultValue={event?.location ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="online-url">オンラインURL</FieldLabel>
                  <Input
                    id="online-url"
                    name="onlineUrl"
                    type="text"
                    placeholder="例: https://zoom.us/..."
                    defaultValue={event?.onlineUrl ?? ""}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <FieldLabel htmlFor="description">イベント詳細</FieldLabel>
                <textarea
                  id="description"
                  name="description"
                  rows={6}
                  maxLength={5000}
                  placeholder="イベントの目的、プログラム、持ち物、注意事項などを記入してください"
                  defaultValue={event?.description ?? ""}
                  className="w-full py-3 px-4 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all resize-y placeholder:text-outline-variant"
                />
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              name="action"
              value="publish"
              disabled={isPending}
              onClick={(e) => {
                if (!confirm("イベントを公開しますか？")) e.preventDefault();
              }}
              className="signature-gradient text-white text-sm font-bold px-8 py-3 rounded-lg shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending ? "処理中..." : "公開する"}
            </button>
            <button
              type="submit"
              name="action"
              value="draft"
              disabled={isPending}
              onClick={(e) => {
                if (!confirm("下書きとして保存しますか？")) e.preventDefault();
              }}
              className="bg-surface-container-low text-on-surface text-sm font-bold px-8 py-3 rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-50"
            >
              {isPending ? "処理中..." : "下書き保存"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
