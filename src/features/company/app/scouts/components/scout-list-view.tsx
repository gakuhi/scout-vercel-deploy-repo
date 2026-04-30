"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/shared/utils/cn";
import { Tag } from "@/components/ui/tag";
import { MONTHLY_SCOUT_LIMIT } from "@/features/company/app/scouts/schemas";
import type { ScoutListItem, ScoutStatus } from "@/features/company/app/scouts/schemas";

const SCOUT_STATUS_LABELS: Record<ScoutStatus, string> = {
  sent: "未読",
  read: "既読",
  accepted: "承諾",
  declined: "辞退",
  expired: "期限切れ",
};

type ScoutListViewProps = {
  scouts: ScoutListItem[];
  sentThisMonth: number;
};

type FilterTab = "all" | ScoutStatus;

const statusTagVariant: Record<ScoutStatus, "accent" | "secondary" | "neutral"> = {
  sent: "neutral",
  read: "secondary",
  accepted: "accent",
  declined: "neutral",
  expired: "neutral",
};

export function ScoutListView({ scouts, sentThisMonth }: ScoutListViewProps) {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");

  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [displayCount, setDisplayCount] = useState(100);

  // 求人の選択肢を抽出（重複排除）
  const jobPostingOptions = Array.from(
    new Set(scouts.map((s) => s.jobPostingTitle).filter(Boolean)),
  ) as string[];

  const filteredScouts = scouts.filter((scout) => {
    if (filter !== "all" && scout.status !== filter) return false;
    if (jobFilter && scout.jobPostingTitle !== jobFilter) return false;
    if (periodFilter) {
      if (!scout.sentAt) return false;
      const sentDate = new Date(scout.sentAt);
      const now = new Date();
      const diffDays = (now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24);
      if (periodFilter === "week" && diffDays > 7) return false;
      if (periodFilter === "month" && diffDays > 30) return false;
      if (periodFilter === "3months" && diffDays > 90) return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      // 学生氏名は承諾後のみ studentName が入っているので、検索対象に含めても
      // 承諾前の学生にはマッチしない（学生検索画面と同じ仕様）。
      return (
        scout.subject.toLowerCase().includes(q) ||
        scout.studentName?.toLowerCase().includes(q) ||
        scout.studentUniversity?.toLowerCase().includes(q) ||
        scout.jobPostingTitle?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statusCounts: Record<ScoutStatus, number> = {
    sent: 0,
    read: 0,
    accepted: 0,
    declined: 0,
    expired: 0,
  };
  for (const s of scouts) {
    statusCounts[s.status]++;
  }

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "すべて", count: scouts.length },
    { key: "sent", label: "未読", count: statusCounts.sent },
    { key: "read", label: "既読", count: statusCounts.read },
    { key: "accepted", label: "承諾", count: statusCounts.accepted },
    { key: "declined", label: "辞退", count: statusCounts.declined },
    { key: "expired", label: "期限切れ", count: statusCounts.expired },
  ];

  const respondedCount = statusCounts.accepted + statusCounts.declined;
  const acceptRate =
    respondedCount > 0
      ? Math.round((statusCounts.accepted / respondedCount) * 100)
      : 0;

  return (
    <div>
      <div className="flex items-end justify-between mb-10">
        <div>
          <span className="text-[10px] font-bold text-tertiary-container uppercase tracking-[0.2em] mb-3 block">
            Scout History
          </span>
          <h1 className="text-5xl font-extrabold text-primary-container leading-none tracking-tight">
            スカウト履歴
          </h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="send" label="送信数" value={scouts.length} />
        <StatCard
          icon="mark_email_read"
          label="既読数"
          value={statusCounts.read + statusCounts.accepted + statusCounts.declined}
        />
        <StatCard icon="check_circle" label="承諾数" value={statusCounts.accepted} />
        <StatCard
          icon="percent"
          label="承諾率"
          value={`${acceptRate}%`}
        />
      </div>

      {/* 今月の送信状況 */}
      <div className="mb-6 bg-surface-container-lowest rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon name="mail" className="text-primary-container text-lg" />
            <span className="text-sm font-bold text-primary-container">
              今月の送信状況
            </span>
          </div>
          <span className="text-2xl font-extrabold text-primary-container">
            {sentThisMonth}
            <span className="text-sm font-medium text-outline ml-1">/ {MONTHLY_SCOUT_LIMIT}通</span>
          </span>
        </div>
        <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min((sentThisMonth / MONTHLY_SCOUT_LIMIT) * 100, 100)}%`,
              background: sentThisMonth >= MONTHLY_SCOUT_LIMIT - 5
                ? "var(--color-error)"
                : "linear-gradient(90deg, var(--color-primary-container), var(--color-primary))",
            }}
          />
        </div>
        {sentThisMonth >= MONTHLY_SCOUT_LIMIT - 5 && (
          <p className="text-[10px] text-error font-semibold mt-2">
            残り{MONTHLY_SCOUT_LIMIT - sentThisMonth}通です
          </p>
        )}
      </div>

      {/* Search + Job Filter */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="件名、学生名、大学名で検索..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest soft-border rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all placeholder:text-outline-variant"
          />
        </div>
        {jobPostingOptions.length > 0 && (
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="py-2.5 px-3 bg-surface-container-lowest soft-border rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
          >
            <option value="">すべての求人</option>
            {jobPostingOptions.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
        )}
        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          className="py-2.5 px-3 bg-surface-container-lowest soft-border rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
        >
          <option value="">すべての期間</option>
          <option value="week">今週</option>
          <option value="month">今月</option>
          <option value="3months">3ヶ月以内</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-surface-container-low rounded-lg p-1 w-fit flex-wrap">
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

      {/* Scout List */}
      {filteredScouts.length === 0 ? (
        <div className="text-center py-20">
          <Icon
            name="mail"
            className="text-outline-variant text-5xl mb-4"
          />
          <p className="text-outline font-medium">
            {filter === "all"
              ? "スカウトがまだ送信されていません"
              : `${SCOUT_STATUS_LABELS[filter as ScoutStatus]}のスカウトはありません`}
          </p>
        </div>
      ) : (
        (() => {
          const batches = groupByBatch(filteredScouts);
          return (
            <div className="space-y-4">
              {batches.slice(0, displayCount).map((batch) => (
                <BatchGroup key={batch.key} batch={batch} highlightId={highlightId} />
              ))}
              {batches.length > displayCount && (
                <div className="text-center pt-4">
                  <button
                    type="button"
                    onClick={() => setDisplayCount((prev) => prev + 100)}
                    className="text-sm font-bold text-primary-container hover:underline transition-colors"
                  >
                    もっと見る（残り{batches.length - displayCount}件）
                  </button>
                </div>
              )}
            </div>
          );
        })()
      )}
    </div>
  );
}

type ScoutBatch = {
  key: string;
  subject: string;
  sentAt: string | null;
  jobPostingTitle: string | null;
  scouts: ScoutListItem[];
};

// 分単位に丸めてバッチ判定（ミリ秒のずれを吸収）
function truncateToMinute(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16); // "2026-04-24T05:14"
}

function groupByBatch(scouts: ScoutListItem[]): ScoutBatch[] {
  const batches: ScoutBatch[] = [];
  let current: ScoutBatch | null = null;

  for (const scout of scouts) {
    const sentMinute = truncateToMinute(scout.sentAt);
    if (
      current &&
      truncateToMinute(current.sentAt) === sentMinute &&
      current.subject === scout.subject
    ) {
      current.scouts.push(scout);
    } else {
      current = {
        key: `${sentMinute}-${scout.subject}`,
        subject: scout.subject,
        sentAt: scout.sentAt,
        jobPostingTitle: scout.jobPostingTitle,
        scouts: [scout],
      };
      batches.push(current);
    }
  }
  return batches;
}

function BatchGroup({ batch, highlightId }: { batch: ScoutBatch; highlightId: string | null }) {
  const hasHighlightedScout = highlightId != null && batch.scouts.some((s) => s.id === highlightId);
  const [expanded, setExpanded] = useState(hasHighlightedScout);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasHighlightedScout && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [hasHighlightedScout]);

  const statusCounts: Record<ScoutStatus, number> = {
    sent: 0, read: 0, accepted: 0, declined: 0, expired: 0,
  };
  for (const s of batch.scouts) {
    statusCounts[s.status]++;
  }

  const sentDate = batch.sentAt
    ? new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(batch.sentAt))
    : "—";

  return (
    <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
      <div
        className="p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-surface-container-low/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="text-sm font-bold text-primary-container truncate">
              {batch.subject}
            </span>
            <span className="text-xs font-semibold text-outline bg-surface-container-low px-2 py-0.5 rounded-full">
              {batch.scouts.length}人に送信
            </span>
            {statusCounts.accepted > 0 && (
              <Tag variant="accent">{statusCounts.accepted}承諾</Tag>
            )}
            {statusCounts.read > 0 && (
              <Tag variant="secondary">{statusCounts.read}既読</Tag>
            )}
            {statusCounts.declined > 0 && (
              <Tag variant="neutral">{statusCounts.declined}辞退</Tag>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-outline">
            {batch.jobPostingTitle && (
              <span className="flex items-center gap-1">
                <Icon name="work" className="text-sm" />
                {batch.jobPostingTitle}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Icon name="schedule" className="text-sm" />
              {sentDate}
            </span>
          </div>
        </div>
        <Icon
          name={expanded ? "expand_less" : "expand_more"}
          className="text-outline text-xl shrink-0"
        />
      </div>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* 送信先一覧 */}
          <div>
            <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
              送信先（{batch.scouts.length}人）
            </p>
            <div className="space-y-1.5">
              {batch.scouts.map((scout) => {
                const isHighlighted = scout.id === highlightId;
                return (
                <div
                  key={scout.id}
                  ref={isHighlighted ? highlightRef : undefined}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-4 py-2.5",
                    isHighlighted
                      ? "ring-2 ring-primary-container/30 ring-inset animate-highlight-fade"
                      : "bg-surface-container-low",
                  )}
                >
                  <div className="flex items-center gap-4 text-xs">
                    {scout.studentUniversity && (
                      <span className="flex items-center gap-1 text-outline">
                        <Icon name="school" className="text-sm" />
                        {scout.studentUniversity}
                      </span>
                    )}
                    {scout.studentName && (
                      <span className="flex items-center gap-1 font-medium text-on-surface">
                        <Icon name="person" className="text-sm text-outline" />
                        {scout.studentName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {scout.status === "accepted" && (
                      <Link
                        href={`/company/messages/${scout.id}`}
                        className="flex items-center gap-1 text-xs font-bold text-primary-container hover:underline"
                      >
                        <Icon name="forum" className="text-sm" />
                        メッセージへ
                      </Link>
                    )}
                    <Tag variant={statusTagVariant[scout.status]}>
                      {SCOUT_STATUS_LABELS[scout.status]}
                    </Tag>
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* 本文 */}
          <div>
            <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
              本文
            </p>
            <div className="bg-surface-container-low rounded-lg p-4">
              <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">
                {batch.scouts[0].message}
              </p>
            </div>
          </div>
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

