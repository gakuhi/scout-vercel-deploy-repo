"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/shared/utils/cn";
import { ApplyButton } from "./apply-button";
import type { ApplyDefaults } from "./apply-dialog";
import { useApplyStatus } from "./apply-status";

const PAGE_SIZE = 10;
import {
  deriveAvailability,
  EVENT_CATEGORIES,
  JOB_TYPES,
  type EventAvailability,
  type EventBadge,
  type EventFilterKey,
  type EventItem,
  type EventsData,
  type EventsHero,
  type JobTypeKey,
} from "../schema";
import {
  matchesFilter,
  matchesJobType,
  matchesMonth,
  matchesSearch,
  matchesYear,
} from "../lib/filters";
import {
  compareEvents,
  SORT_KEYS,
  SORT_LABELS,
  type SortKey,
} from "../lib/sort";
import { getCountdown } from "../lib/countdown";
import type { ApplyBlockReason } from "./apply-button";

type Props = {
  data: EventsData;
  /** 申込フォームの初期値。プロフィール未連携の項目は undefined。 */
  applyDefaults?: ApplyDefaults;
  /** プロフィール未完了で申込不可。ApplyButton を CTA に切り替えるため。 */
  profileIncomplete?: boolean;
};

const FILTER_TABS: { key: EventFilterKey; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "applied", label: "申し込み済み" },
  { key: "online", label: "オンライン" },
  { key: "offline", label: "オフライン" },
  { key: "hybrid", label: "ハイブリッド" },
  // カテゴリは企業側のイベント作成画面 (EVENT_TYPES) と同一の値・順序。
  ...EVENT_CATEGORIES.map((c) => ({ key: c as EventFilterKey, label: c })),
];

export function EventsView({ data, applyDefaults, profileIncomplete }: Props) {
  const [activeFilter, setActiveFilter] = useState<EventFilterKey>("all");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedJobType, setSelectedJobType] = useState<JobTypeKey | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const { isApplied } = useApplyStatus();

  // 卒業年度の選択肢は「今年 + 4 年」の 5 年ぶんを基本レンジとし、
  // データ側に未来側の年度があれば追加で含める（昇順、null は全学年扱い）。
  // 今年より前の年は古いデータが残っていてもフィルタ候補には出さない。
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set<number>();
    for (let y = currentYear; y <= currentYear + 4; y++) {
      years.add(y);
    }
    for (const e of data.events) {
      if (e.targetGraduationYear !== null && e.targetGraduationYear >= currentYear) {
        years.add(e.targetGraduationYear);
      }
    }
    return [...years].sort((a, b) => a - b);
  }, [data.events]);

  // 開催月の選択肢は「今月」から「5 ヶ月先」までの 6 ヶ月ぶん。
  // value は "YYYY-MM"、label は "YYYY年M月"。年跨ぎも自動で送られる。
  const monthOptions = useMemo(() => {
    const now = new Date();
    const list: { value: string; label: string }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const mm = String(m).padStart(2, "0");
      list.push({ value: `${y}-${mm}`, label: `${y}年${m}月` });
    }
    return list;
  }, []);

  const filteredEvents = useMemo(() => {
    const filtered = data.events.filter(
      (e) =>
        matchesFilter(e, activeFilter, isApplied) &&
        matchesYear(e, selectedYear) &&
        matchesMonth(e, selectedMonth) &&
        matchesJobType(e, selectedJobType) &&
        matchesSearch(e, searchQuery),
    );
    return [...filtered].sort((a, b) => compareEvents(a, b, sortKey));
  }, [
    data.events,
    activeFilter,
    selectedYear,
    selectedMonth,
    selectedJobType,
    searchQuery,
    sortKey,
    isApplied,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));

  // フィルタ変更で現ページが範囲外になった場合は 1 に戻す。
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  // フィルタ・検索・ソート変更時はページを先頭へ戻す。
  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeFilter,
    selectedYear,
    selectedMonth,
    selectedJobType,
    searchQuery,
    sortKey,
  ]);

  const pagedEvents = useMemo(
    () =>
      filteredEvents.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [filteredEvents, currentPage],
  );

  return (
    <div className="-mx-6 md:-mx-10 -mt-24 md:-mt-10 md:-mb-16">
      <Hero hero={data.hero} />
      <FilterSection
        active={activeFilter}
        onChange={setActiveFilter}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        yearOptions={yearOptions}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        monthOptions={monthOptions}
        selectedJobType={selectedJobType}
        onJobTypeChange={setSelectedJobType}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortKey={sortKey}
        onSortChange={setSortKey}
      />
      <EventsSection
        events={pagedEvents}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        applyDefaults={applyDefaults}
        profileIncomplete={profileIncomplete}
      />
    </div>
  );
}

function Hero({ hero }: { hero: EventsHero }) {
  return (
    <section className="relative h-[420px] md:h-[460px] min-h-[400px] flex items-center overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={hero.imageUrl}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-primary/50 backdrop-brightness-75" />
      <div className="relative z-10 w-full px-6 md:px-12 pt-16 md:pt-0">
        <div className="max-w-2xl">
          <span className="inline-block px-3 py-1 mb-4 text-[10px] font-bold tracking-[0.2em] text-on-tertiary-fixed bg-tertiary-fixed rounded-full">
            {hero.eyebrow}
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-6 tracking-tight whitespace-pre-line">
            {hero.title}
          </h1>
          <div className="w-20 h-1 bg-tertiary-fixed" />
        </div>
      </div>
    </section>
  );
}

function FilterSection({
  active,
  onChange,
  selectedYear,
  onYearChange,
  yearOptions,
  selectedMonth,
  onMonthChange,
  monthOptions,
  selectedJobType,
  onJobTypeChange,
  searchQuery,
  onSearchChange,
  sortKey,
  onSortChange,
}: {
  active: EventFilterKey;
  onChange: (f: EventFilterKey) => void;
  selectedYear: number | null;
  onYearChange: (year: number | null) => void;
  yearOptions: number[];
  selectedMonth: string | null;
  onMonthChange: (month: string | null) => void;
  monthOptions: { value: string; label: string }[];
  selectedJobType: JobTypeKey | null;
  onJobTypeChange: (job: JobTypeKey | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortKey: SortKey;
  onSortChange: (k: SortKey) => void;
}) {
  // 詳細検索（開催月 / 卒業年度 / 並び替え）の開閉。職種＋検索だけ常時表示にして UI を軽くする。
  const [showAdvanced, setShowAdvanced] = useState(false);
  // 詳細検索内の値が初期値以外なら、ボタンに「適用中 N 件」のヒントを出す。
  const advancedApplied =
    (selectedMonth ? 1 : 0) +
    (selectedYear !== null ? 1 : 0) +
    (sortKey !== "date_asc" ? 1 : 0);
  return (
    <section className="bg-surface-container-high py-8 md:py-10">
      <div className="px-6 md:px-12">
        <div className="bg-surface-container-lowest p-5 md:p-6 rounded-xl shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <div className="flex-1 relative">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl leading-none pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="キーワードで検索（タイトル / 場所 / カテゴリ）"
                className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-transparent focus:border-primary-container/40 rounded-lg text-sm outline-none"
              />
            </div>
            <div className="flex-none w-full md:w-44 relative">
              <Icon
                name="work"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl leading-none pointer-events-none"
              />
              <select
                aria-label="職種で絞り込み"
                value={selectedJobType ?? ""}
                onChange={(e) =>
                  onJobTypeChange(
                    e.target.value ? (e.target.value as JobTypeKey) : null,
                  )
                }
                className="w-full pl-10 pr-8 py-3 bg-surface-container-low border border-transparent focus:border-primary-container/40 rounded-lg text-sm outline-none text-on-surface-variant appearance-none cursor-pointer"
              >
                <option value="">職種（全て）</option>
                {JOB_TYPES.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
              <Icon
                name="expand_more"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-outline text-xl leading-none pointer-events-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
              className="flex-none inline-flex items-center justify-center gap-1.5 px-5 py-3 bg-surface-container-low text-on-surface-variant text-sm font-bold rounded-lg hover:bg-surface-variant transition-colors"
            >
              <Icon name="tune" className="text-[16px]" />
              詳細検索
              {advancedApplied > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-bold">
                  {advancedApplied}
                </span>
              )}
              <Icon
                name={showAdvanced ? "expand_less" : "expand_more"}
                className="text-[16px]"
              />
            </button>
          </div>
          {showAdvanced && (
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 pt-3 border-t border-outline-variant/20">
              <div className="flex-1 relative">
                <Icon
                  name="calendar_today"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl leading-none pointer-events-none"
                />
                <select
                  aria-label="開催月で絞り込み"
                  value={selectedMonth ?? ""}
                  onChange={(e) => onMonthChange(e.target.value || null)}
                  className="w-full pl-10 pr-8 py-3 bg-surface-container-low border border-transparent focus:border-primary-container/40 rounded-lg text-sm outline-none text-on-surface-variant appearance-none cursor-pointer"
                >
                  <option value="">開催月（全て）</option>
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <Icon
                  name="expand_more"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-outline text-xl leading-none pointer-events-none"
                />
              </div>
              <div className="flex-1 relative">
                <Icon
                  name="school"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl leading-none pointer-events-none"
                />
                <select
                  aria-label="対象学年"
                  value={selectedYear ?? ""}
                  onChange={(e) =>
                    onYearChange(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full pl-10 pr-8 py-3 bg-surface-container-low border border-transparent focus:border-primary-container/40 rounded-lg text-sm outline-none text-on-surface-variant appearance-none cursor-pointer"
                >
                  <option value="">全学年</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y} 年卒
                    </option>
                  ))}
                </select>
                <Icon
                  name="expand_more"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-outline text-xl leading-none pointer-events-none"
                />
              </div>
              <div className="flex-1 relative">
                <Icon
                  name="sort"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl leading-none pointer-events-none"
                />
                <select
                  aria-label="並び替え"
                  value={sortKey}
                  onChange={(e) => onSortChange(e.target.value as SortKey)}
                  className="w-full pl-10 pr-8 py-3 bg-surface-container-low border border-transparent focus:border-primary-container/40 rounded-lg text-sm outline-none text-on-surface-variant appearance-none cursor-pointer"
                >
                  {SORT_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {SORT_LABELS[k]}
                    </option>
                  ))}
                </select>
                <Icon
                  name="expand_more"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-outline text-xl leading-none pointer-events-none"
                />
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-outline-variant/20">
            {FILTER_TABS.map((tab) => {
              const isActive = tab.key === active;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onChange(tab.key)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[12px] font-semibold transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-variant",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function EventsSection({
  events,
  currentPage,
  totalPages,
  onPageChange,
  applyDefaults,
  profileIncomplete,
}: {
  events: EventItem[];
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  applyDefaults?: ApplyDefaults;
  profileIncomplete?: boolean;
}) {
  return (
    <section className="px-6 md:px-12 py-10 md:py-12">
      {events.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl p-12 text-center">
          <Icon name="event_busy" className="text-outline text-3xl mb-2 block" />
          <p className="text-sm text-on-surface-variant font-semibold">
            該当するイベントはまだありません
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              applyDefaults={applyDefaults}
              profileIncomplete={profileIncomplete}
            />
          ))}
        </div>
      )}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onChange={onPageChange}
      />
    </section>
  );
}

function EventCard({
  event,
  applyDefaults,
  profileIncomplete,
}: {
  event: EventItem;
  applyDefaults?: ApplyDefaults;
  profileIncomplete?: boolean;
}) {
  const { isApplied } = useApplyStatus();
  const applied = isApplied(event.id);
  // 一覧で `?mock=1` を付けて閲覧している場合は、詳細リンクにも引き継ぐ
  // （詳細画面側の認証バイパスと mock fallback を継続させるため）。
  const searchParams = useSearchParams();
  const detailHref =
    searchParams?.get("mock") === "1"
      ? `/student/events/${event.id}?mock=1`
      : `/student/events/${event.id}`;
  const availability = deriveAvailability(event);
  const countdown = getCountdown(event);
  const blockReason: ApplyBlockReason =
    availability.status === "full"
      ? "full"
      : availability.status === "closed"
        ? "closed"
        : null;
  return (
    <article className="bg-surface-container-lowest rounded-xl overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
      <div className="relative h-52 md:h-56 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.imageUrl}
          alt=""
          aria-hidden
          className="w-full h-full object-cover"
        />
        <div
          className={cn(
            "absolute top-4 left-4 text-[10px] font-bold px-3 py-1 rounded-full",
            badgeStyles(event.badge),
          )}
        >
          {badgeLabel(event.badge)}
        </div>
        {countdown && (
          <div
            className={cn(
              "absolute bottom-4 left-4 inline-flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm",
              countdown.urgent
                ? "bg-error text-on-error"
                : "bg-surface-container-lowest/95 text-on-surface",
            )}
          >
            <Icon
              name={countdown.urgent ? "alarm" : "schedule"}
              className="text-[12px]"
            />
            {countdown.label}
          </div>
        )}
        {applied && (
          <div className="absolute top-4 right-4 inline-flex items-center gap-1 bg-[#e8f5e9] text-[#1b5e20] text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">
            <Icon name="check_circle" filled className="text-[14px]" />
            申し込み済み
          </div>
        )}
      </div>
      <div className="p-5 md:p-6">
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-on-surface-variant text-[12px] mb-3">
          <div className="flex items-center gap-1">
            <Icon name="calendar_month" className="text-[16px]" />
            <span>{event.dateLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            <Icon
              name={locationIconName(event.locationKind)}
              className="text-[16px]"
            />
            <span>{event.locationLabel}</span>
          </div>
          {event.targetGraduationYear !== null && (
            <div className="flex items-center gap-1">
              <Icon name="school" className="text-[16px]" />
              <span>{event.targetGraduationYear} 年卒</span>
            </div>
          )}
        </div>
        <h3 className="text-lg md:text-xl font-bold text-on-surface leading-snug mb-3 min-h-[3.5rem] line-clamp-2">
          {event.title}
        </h3>
        {event.jobTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {event.jobTypes.map((j) => (
              <span
                key={j}
                className="inline-flex items-center text-[11px] font-bold bg-primary-container/10 text-primary px-2.5 py-1 rounded-full"
              >
                {j}
              </span>
            ))}
          </div>
        )}
        <AvailabilityRow availability={availability} />
        <div className="flex gap-3">
          <Link
            href={detailHref}
            className="flex-1 text-center py-3 bg-surface-container-low text-on-surface-variant text-sm font-bold rounded-lg hover:bg-surface-variant transition-colors"
          >
            詳細を見る
          </Link>
          <ApplyButton
            context={{
              eventId: event.id,
              eventTitle: event.title,
              eventDateLabel: event.dateLabel,
              eventLocationLabel: event.locationLabel,
            }}
            defaults={applyDefaults}
            blockReason={blockReason}
            profileIncomplete={profileIncomplete}
            className="flex-1 py-3 signature-gradient text-white text-sm font-bold rounded-lg active:scale-95 transition-transform"
          >
            申し込む
          </ApplyButton>
        </div>
      </div>
    </article>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onChange,
}: {
  currentPage: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const window = getPageWindow(currentPage, totalPages);
  return (
    <div className="mt-12 md:mt-16 flex justify-center items-center gap-2 flex-wrap">
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onChange(currentPage - 1)}
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="前のページ"
      >
        <Icon name="chevron_left" className="text-[18px]" />
      </button>
      {window.map((p, i) =>
        p === "…" ? (
          <span
            key={`ellipsis-${i}`}
            aria-hidden
            className="mx-1 text-outline"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === currentPage ? "page" : undefined}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-lg font-bold active:scale-95 transition-colors",
              p === currentPage
                ? "bg-primary text-white"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-variant",
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onChange(currentPage + 1)}
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="次のページ"
      >
        <Icon name="chevron_right" className="text-[18px]" />
      </button>
    </div>
  );
}

/** 現在ページを中心に前後 1 ページ + 先頭・末尾を返す。省略は "…"。 */
function getPageWindow(
  current: number,
  total: number,
): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

function AvailabilityRow({ availability }: { availability: EventAvailability }) {
  const capacityPill = capacityPillProps(availability);
  const deadlinePill = deadlinePillProps(availability);
  if (!capacityPill && !deadlinePill) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px]">
      {capacityPill && (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold",
            capacityPill.className,
          )}
        >
          <Icon name={capacityPill.icon} className="text-[14px]" />
          {capacityPill.label}
        </span>
      )}
      {deadlinePill && (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium",
            deadlinePill.className,
          )}
        >
          <Icon name="schedule" className="text-[14px]" />
          {deadlinePill.label}
        </span>
      )}
    </div>
  );
}

function capacityPillProps(
  availability: EventAvailability,
): { label: string; icon: string; className: string } | null {
  if (availability.status === "full") {
    return {
      label: "満員御礼",
      icon: "block",
      className: "bg-error-container text-on-error-container",
    };
  }
  if (availability.status === "nearly_full") {
    return {
      label: "残り少し",
      icon: "priority_high",
      className: "bg-tertiary-fixed text-on-tertiary-fixed",
    };
  }
  if (availability.capacity !== null) {
    return {
      label: "受付中",
      icon: "group",
      className: "bg-surface-container text-on-surface-variant",
    };
  }
  return null;
}

function deadlinePillProps(
  availability: EventAvailability,
): { label: string; className: string } | null {
  if (!availability.deadlineLabel) return null;
  if (availability.status === "closed") {
    return {
      label: "申込締切",
      className: "bg-error-container text-on-error-container font-bold",
    };
  }
  return {
    label: `締切 ${availability.deadlineLabel}`,
    className: "bg-surface-container text-on-surface-variant",
  };
}

function locationIconName(kind: EventItem["locationKind"]): string {
  if (kind === "online") return "videocam";
  if (kind === "hybrid") return "sync_alt";
  return "location_on";
}

function badgeLabel(badge: EventBadge): string {
  if (badge === "exclusive") return "限定招待";
  if (badge === "online") return "オンライン";
  if (badge === "hybrid") return "ハイブリッド";
  return "オフライン";
}

function badgeStyles(badge: EventBadge): string {
  if (badge === "exclusive") return "bg-tertiary-fixed text-on-tertiary-fixed";
  if (badge === "online") return "bg-primary-fixed text-on-primary-fixed";
  if (badge === "hybrid") return "bg-secondary-fixed text-on-secondary-fixed";
  return "bg-secondary-container text-on-secondary-container";
}
