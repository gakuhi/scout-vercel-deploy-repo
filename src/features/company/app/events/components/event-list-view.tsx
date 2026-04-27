"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Tag } from "@/components/ui/tag";
import { EVENT_FORMAT_LABELS } from "@/features/company/app/events/schemas";
import {
  toggleEventPublishAction,
  deleteEventAction,
} from "@/features/company/app/events/actions/toggle-publish";
import type { EventListItem } from "@/features/company/app/events/queries";

type EventListViewProps = {
  events: EventListItem[];
  isEditable: boolean;
};

type FilterTab = "all" | "published" | "draft";

export function EventListView({ events, isEditable }: EventListViewProps) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const filteredEvents = events.filter((event) => {
    if (filter === "published" && !event.isPublished) return false;
    if (filter === "draft" && event.isPublished) return false;
    if (search.trim()) {
      return event.title.toLowerCase().includes(search.trim().toLowerCase());
    }
    return true;
  });

  const publishedCount = events.filter((e) => e.isPublished).length;
  const draftCount = events.filter((e) => !e.isPublished).length;
  const totalRegistrations = events.reduce(
    (sum, e) => sum + e.registrationCount,
    0,
  );

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "すべて", count: events.length },
    { key: "published", label: "公開中", count: publishedCount },
    { key: "draft", label: "下書き", count: draftCount },
  ];

  return (
    <div>
      <div className="flex items-end justify-between mb-10">
        <div>
          <span className="text-[10px] font-bold text-tertiary-container uppercase tracking-[0.2em] mb-3 block">
            Event Management
          </span>
          <h1 className="text-5xl font-extrabold text-primary-container leading-none tracking-tight">
            イベント管理
          </h1>
        </div>
        {isEditable && (
          <Link
            href="/company/events/new"
            className="inline-flex items-center gap-2 signature-gradient text-white text-sm font-bold px-6 py-3 rounded-lg shadow-lg hover:opacity-90 transition-opacity"
          >
            <Icon name="add" />
            新規イベント作成
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="event" label="イベント数" value={events.length} />
        <StatCard icon="campaign" label="公開中" value={publishedCount} />
        <StatCard icon="group" label="総申込数" value={totalRegistrations} />
        <StatCard
          icon="calendar_today"
          label="直近開催（公開中）"
          value={(() => {
            const now = new Date();
            const upcoming = events
              .filter((e) => e.isPublished && new Date(e.startsAt) >= now)
              .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
            return upcoming[0]
              ? new Intl.DateTimeFormat("ja-JP", {
                  month: "short",
                  day: "numeric",
                }).format(new Date(upcoming[0].startsAt))
              : "—";
          })()}
        />
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Icon
          name="search"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="イベント名で検索..."
          className="w-full max-w-md pl-10 pr-4 py-2.5 bg-surface-container-lowest soft-border rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all placeholder:text-outline-variant"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-surface-container-low rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
              filter === tab.key
                ? "bg-surface-container-lowest text-primary-container shadow-sm"
                : "text-outline hover:text-on-surface"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-[10px]">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Event List */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-20">
          <Icon
            name="event_busy"
            className="text-outline-variant text-5xl mb-4"
          />
          <p className="text-outline font-medium">
            {filter === "all"
              ? "イベントがまだ作成されていません"
              : filter === "published"
                ? "公開中のイベントはありません"
                : "下書きのイベントはありません"}
          </p>
          {isEditable && filter === "all" && (
            <Link
              href="/company/events/new"
              className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-primary-container hover:underline"
            >
              <Icon name="add" />
              新しくイベントを作成する
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} isEditable={isEditable} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon name={icon} className="text-outline text-lg" />
        <span className="text-[10px] font-bold text-outline uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-3xl font-extrabold text-primary-container">{value}</p>
    </div>
  );
}

function EventCard({
  event,
  isEditable,
}: {
  event: EventListItem;
  isEditable: boolean;
}) {
  const [isToggling, setIsToggling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleTogglePublish() {
    const message = event.isPublished
      ? `「${event.title}」を非公開にしますか？`
      : `「${event.title}」を公開しますか？`;
    if (!confirm(message)) return;
    setActionError(null);
    setIsToggling(true);
    const result = await toggleEventPublishAction(event.id, !event.isPublished);
    setIsToggling(false);
    if (result.error) setActionError(result.error);
  }

  async function handleDelete() {
    if (!confirm(`「${event.title}」を削除しますか？`)) return;
    setActionError(null);
    const result = await deleteEventAction(event.id);
    if (result.error) setActionError(result.error);
  }

  const dateStr = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(event.startsAt));

  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 hover:shadow-md transition-shadow">
      {actionError && (
        <div className="mb-3 bg-error-container text-on-error-container p-3 rounded-lg text-xs font-semibold">
          {actionError}
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={`/company/events/${event.id}/edit`}
              className="text-lg font-bold text-primary-container hover:underline truncate"
            >
              {event.title}
            </Link>
            {event.isPublished ? (
              <Tag variant="secondary">公開中</Tag>
            ) : (
              <Tag variant="neutral">下書き</Tag>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-outline flex-wrap">
            {event.eventType && (
              <span className="flex items-center gap-1">
                <Icon name="category" className="text-sm" />
                {event.eventType}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Icon name="videocam" className="text-sm" />
              {EVENT_FORMAT_LABELS[event.format]}
            </span>
            <span className="flex items-center gap-1">
              <Icon name="schedule" className="text-sm" />
              {dateStr}
            </span>
            {event.location && (
              <span className="flex items-center gap-1">
                <Icon name="location_on" className="text-sm" />
                {event.location}
              </span>
            )}
            {event.capacity && (
              <span className="flex items-center gap-1">
                <Icon name="group" className="text-sm" />
                {event.registrationCount}/{event.capacity}名
              </span>
            )}
          </div>
        </div>

        {isEditable && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleTogglePublish}
              disabled={isToggling}
              className="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 bg-surface-container-low text-on-surface hover:bg-surface-container-high"
            >
              {event.isPublished ? "非公開にする" : "公開する"}
            </button>
            <Link
              href={`/company/events/${event.id}/edit`}
              className="p-2 text-outline hover:text-primary-container transition-colors"
            >
              <Icon name="edit" className="text-lg" />
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              className="p-2 text-outline hover:text-error transition-colors"
            >
              <Icon name="delete" className="text-lg" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
