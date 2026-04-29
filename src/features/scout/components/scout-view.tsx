"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import {
  acceptScout,
  declineScout,
  markScoutAsRead,
  toggleScoutFavorite,
  type ScoutActionState,
} from "@/features/scout/actions";
import {
  FRESH_TAG,
  RESOLVED_BADGE,
  UNREAD_TAG,
  isFresh,
  type ScoutDisplayStatus,
  type ScoutItem,
  type TagStyle,
} from "@/features/scout/schema";

type FilterKey = "all" | "unread" | "read" | "accepted" | "favorite";
type SortKey = "newest" | "oldest" | "status";

const FILTERS: ReadonlyArray<{ key: FilterKey; label: string; icon?: string }> =
  [
    { key: "all", label: "全て" },
    { key: "unread", label: "未読" },
    { key: "read", label: "既読" },
    { key: "accepted", label: "承諾済み" },
    { key: "favorite", label: "お気に入り", icon: "star" },
  ];

/** ステータス順ソートの優先度（小さいほど上）。 */
const STATUS_ORDER: Record<ScoutDisplayStatus, number> = {
  new: 0,
  read: 1,
  accepted: 2,
  declined: 3,
  expired: 4,
};

type Props = {
  scouts: ScoutItem[];
};

export function ScoutView({ scouts }: Props) {
  const [items, setItems] = useState(scouts);
  // ナビゲーションから遷移してきた直後は一覧画面を見せたいので、初期選択は
  // null。ユーザーがリストから明示的に選んだら詳細を表示する。
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  // 未読フィルタで選択した瞬間、既読化で即リストから消えて現在地を
  // 見失う不具合を避けるため、「選択時点で未読だったスカウト」を
  // 一時的にフィルタに残す（他を選ぶまで sticky に表示）。
  const [stickyUnreadId, setStickyUnreadId] = useState<string | null>(null);

  const handleSelect = (id: string | null) => {
    if (id === null) {
      setStickyUnreadId(null);
    } else {
      const scout = items.find((s) => s.id === id);
      setStickyUnreadId(scout?.status === "new" ? id : null);
    }
    setSelectedId(id);
  };

  const filtered = useMemo(() => {
    const base = items.filter((s) => {
      if (filter === "unread")
        return s.status === "new" || s.id === stickyUnreadId;
      if (filter === "read") return s.status !== "new";
      if (filter === "accepted") return s.status === "accepted";
      if (filter === "favorite") return s.isFavorite;
      return true;
    });
    const sorted = [...base].sort((a, b) => {
      if (sort === "status") {
        const d = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (d !== 0) return d;
      }
      if (sort === "oldest") {
        return a.sentAt.localeCompare(b.sentAt);
      }
      return b.sentAt.localeCompare(a.sentAt);
    });
    return sorted;
  }, [items, filter, sort, stickyUnreadId]);

  // selectedId を明示的に null にできるよう、fallback は初期 state のみで行い
  // useMemo では参照のみ（null なら null を返す）。これにより「一覧に戻る」が
  // モバイルで確実にリスト表示に戻る。
  const selected = useMemo(
    () =>
      selectedId ? (items.find((s) => s.id === selectedId) ?? null) : null,
    [items, selectedId],
  );

  const unreadCount = items.filter((s) => s.status === "new").length;

  // スカウトを開いたら既読にする（オプティミスティック + サーバー）
  const [, startReadTransition] = useTransition();
  useEffect(() => {
    if (!selected || selected.status !== "new") return;
    const id = selected.id;
    setItems((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "read" } : s)),
    );
    startReadTransition(async () => {
      await markScoutAsRead(id);
    });
  }, [selected]);

  const updateStatus = (id: string, next: ScoutDisplayStatus) => {
    setItems((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: next } : s)),
    );
  };

  const [, startFavoriteTransition] = useTransition();
  const toggleFavorite = (id: string) => {
    let nextValue = false;
    setItems((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        nextValue = !s.isFavorite;
        return { ...s, isFavorite: nextValue };
      }),
    );
    startFavoriteTransition(async () => {
      await toggleScoutFavorite(id, nextValue);
    });
  };

  if (scouts.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] md:h-[calc(100vh-2.5rem)] -mx-6 md:-mx-10 -mt-10 md:-mt-10 md:-mb-16 md:ml-0 md:mr-0 border-t border-surface-container overflow-hidden">
      <aside
        className={
          selected
            ? "hidden md:flex w-full md:w-72 lg:w-80 shrink-0 flex-col border-r border-surface-container bg-surface"
            : "flex w-full md:w-72 lg:w-80 shrink-0 flex-col border-r border-surface-container bg-surface"
        }
      >
        <div className="px-6 pt-6 pb-3">
          <div className="flex justify-between items-end mb-3">
            <span className="text-[10px] font-bold tracking-[0.2em] text-outline">
              受信箱
            </span>
            {unreadCount > 0 && (
              <span className="text-xs text-secondary font-semibold">
                未読 {unreadCount} 件
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {FILTERS.map((f) => (
              <FilterPill
                key={f.key}
                label={f.label}
                icon={f.icon}
                active={filter === f.key}
                onClick={() => setFilter(f.key)}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <label
              htmlFor="scout-sort"
              className="text-[10px] font-bold text-outline tracking-[0.2em]"
            >
              並び替え
            </label>
            <select
              id="scout-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="flex-grow bg-surface-container-low border-0 rounded-lg px-2 py-1 text-xs font-semibold text-on-surface focus:ring-1 focus:ring-primary-container"
            >
              <option value="newest">新着順</option>
              <option value="oldest">古い順</option>
              <option value="status">ステータス順</option>
            </select>
          </div>
        </div>
        <ul className="flex-grow overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="p-6 text-xs text-outline text-center">
              該当するスカウトがありません
            </li>
          ) : (
            filtered.map((s) => (
              <li key={s.id}>
                <ScoutListItem
                  scout={s}
                  active={s.id === selected?.id}
                  onSelect={() => handleSelect(s.id)}
                  onToggleFavorite={() => toggleFavorite(s.id)}
                />
              </li>
            ))
          )}
        </ul>
      </aside>

      <section
        className={
          selected
            ? "flex-grow min-w-0 bg-surface-container-low overflow-y-auto scrollbar-hide"
            : "hidden md:block flex-grow min-w-0 bg-surface-container-low overflow-y-auto scrollbar-hide"
        }
      >
        {selected ? (
          <ScoutDetail
            scout={selected}
            onBack={() => handleSelect(null)}
            onStatusChange={updateStatus}
            onToggleFavorite={() => toggleFavorite(selected.id)}
          />
        ) : (
          <DetailPlaceholder />
        )}
      </section>
    </div>
  );
}

function FilterPill({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-container text-white text-xs font-bold transition-colors"
          : "shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface-variant text-xs font-semibold hover:bg-surface-container-high transition-colors"
      }
    >
      {icon && <Icon name={icon} className="text-sm" filled={active} />}
      {label}
    </button>
  );
}

function ScoutListItem({
  scout,
  active,
  onSelect,
  onToggleFavorite,
}: {
  scout: ScoutItem;
  active: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  const isUnread = scout.status === "new";
  return (
    <div
      className={
        active
          ? "relative bg-surface-container-lowest border-l-4 border-primary shadow-sm transition-colors"
          : "relative hover:bg-surface-container-low border-l-4 border-transparent transition-colors"
      }
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left p-5"
      >
        <div className="flex justify-between items-start gap-2 mb-3">
          <CompanyLogo
            name={scout.company.name}
            logoUrl={scout.company.logoUrl}
          />
          <ScoutTags scout={scout} />
        </div>
        <h3
          className={
            isUnread
              ? "text-sm font-bold text-on-surface mb-1 line-clamp-2 pr-7"
              : "text-sm font-semibold text-on-surface mb-1 line-clamp-2 pr-7"
          }
        >
          {scout.subject}
        </h3>
        <p className="text-xs text-outline mb-2 truncate">
          {scout.company.name}
        </p>
        <p className="text-[10px] text-outline/80">
          {formatDateTime(scout.sentAt)}
        </p>
      </button>
      <FavoriteButton
        isFavorite={scout.isFavorite}
        onClick={onToggleFavorite}
        className="absolute bottom-3 right-3"
      />
    </div>
  );
}

function FavoriteButton({
  isFavorite,
  onClick,
  className,
}: {
  isFavorite: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={isFavorite ? "お気に入りから外す" : "お気に入りに追加"}
      aria-pressed={isFavorite}
      className={`p-1.5 rounded-full hover:bg-surface-container-high transition-colors ${
        className ?? ""
      }`}
    >
      <Icon
        name="star"
        filled={isFavorite}
        className={
          isFavorite ? "text-tertiary-container text-lg" : "text-outline text-lg"
        }
      />
    </button>
  );
}

function ScoutTags({ scout }: { scout: ScoutItem }) {
  const tags: TagStyle[] = [];
  // accepted/declined/expired は単独で表示
  if (
    scout.status === "accepted" ||
    scout.status === "declined" ||
    scout.status === "expired"
  ) {
    tags.push(RESOLVED_BADGE[scout.status]);
  } else {
    if (isFresh(scout.sentAt)) tags.push(FRESH_TAG);
    if (scout.status === "new") tags.push(UNREAD_TAG);
  }
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      {tags.map((t) => (
        <span
          key={t.label}
          className={`${t.bgClass} ${t.textClass} text-[10px] font-bold px-2 py-0.5 rounded-full`}
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}

const COMPANY_LOGO_SIZE_CLASS = {
  10: "w-10 h-10 text-xs",
  12: "w-12 h-12 text-sm",
  16: "w-16 h-16 text-base",
} as const;

function CompanyLogo({
  name,
  logoUrl,
  size = 10,
}: {
  name: string;
  logoUrl: string | null;
  size?: 10 | 12 | 16;
}) {
  const sizeClass = COMPANY_LOGO_SIZE_CLASS[size];
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={logoUrl}
        alt={name}
        className={`${sizeClass} rounded-lg object-contain bg-surface-container p-1 shrink-0`}
      />
    );
  }
  const initials = name.slice(0, 2);
  return (
    <div
      className={`${sizeClass} rounded-lg bg-primary-container text-white grid place-items-center font-bold shrink-0`}
    >
      {initials}
    </div>
  );
}

function JobHeroBanner({
  company,
  job,
}: {
  company: ScoutItem["company"];
  job: ScoutItem["job"];
}) {
  // 求人画像 (job_postings.hero_image_path) があればそれを使う。
  // 未設定なら picsum.photos の seed 付き placeholder（企業名 seed で安定）。
  const imageUrl =
    job.heroImageUrl ??
    `https://picsum.photos/seed/${encodeURIComponent(company.name)}/1200/400`;
  return (
    <div className="relative rounded-xl overflow-hidden h-36 md:h-44 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={`${company.name} のバナー`}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/10 to-transparent" />
      <div className="absolute left-5 md:left-8 bottom-4 md:bottom-5">
        <p className="text-[10px] font-bold text-white/80 tracking-[0.2em] uppercase mb-1">
          {company.industry ?? "企業情報"}
        </p>
        <h2 className="text-lg md:text-2xl font-extrabold text-white leading-tight drop-shadow">
          {company.name}
        </h2>
      </div>
    </div>
  );
}

function ScoutDetail({
  scout,
  onBack,
  onStatusChange,
  onToggleFavorite,
}: {
  scout: ScoutItem;
  onBack: () => void;
  onStatusChange: (id: string, next: ScoutDisplayStatus) => void;
  onToggleFavorite: () => void;
}) {
  const router = useRouter();
  const isActionable = scout.status === "new" || scout.status === "read";
  const [confirming, setConfirming] = useState<"accept" | "decline" | null>(
    null,
  );

  // スカウトが切り替わったら確認状態はリセット
  useEffect(() => {
    setConfirming(null);
  }, [scout.id]);

  return (
    <div className={isActionable ? "pb-24 md:pb-20" : ""}>
      <div className="p-6 md:p-12">
      <div className="md:hidden sticky top-0 -mx-6 -mt-6 mb-4 z-20 bg-surface-container-low/95 backdrop-blur-md border-b border-surface-container">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-container px-4 py-3"
        >
          <Icon name="arrow_back" className="text-base" />
          一覧に戻る
        </button>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        <JobHeroBanner company={scout.company} job={scout.job} />
        <div className="relative bg-surface-container-lowest p-8 md:p-10 rounded-xl shadow-sm">
          <FavoriteButton
            isFavorite={scout.isFavorite}
            onClick={onToggleFavorite}
            className="absolute top-4 right-4"
          />
          <div className="mb-8 pr-10">
            <p className="text-[10px] font-bold text-secondary tracking-[0.2em] mb-2">
              {statusEyebrow(scout.status)}
            </p>
            {/* 日本語は空白で改行位置が決まらないため狭い列幅だと数文字ごとに
                折り返してしまう。先頭の 【...】 ラベルを小バッジに切り出して
                メインタイトルを短くする。フォントも一段階小さめに。 */}
            <SubjectHeading subject={scout.subject} />
            <div className="text-xs text-outline space-y-0.5 mt-3">
              <p>受信日: {formatDate(scout.sentAt)}</p>
              {scout.expiresAt && (
                <p>有効期限: {formatDate(scout.expiresAt)}</p>
              )}
              {scout.senderName && <p>送信者: {scout.senderName}</p>}
            </div>
          </div>

          <div className="flex gap-4 mb-8 pb-8 border-b border-surface-container">
            <CompanyLogo
              name={scout.company.name}
              logoUrl={scout.company.logoUrl}
              size={12}
            />
            <div className="min-w-0 space-y-2">
              <div>
                <h4 className="text-sm font-bold text-on-surface">
                  {scout.company.name}
                </h4>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-outline">
                  {scout.company.industry && (
                    <span className="inline-flex items-center gap-1">
                      <Icon name="work" className="text-sm" />
                      {scout.company.industry}
                    </span>
                  )}
                  {scout.company.employeeCountRange && (
                    <span className="inline-flex items-center gap-1">
                      <Icon name="groups" className="text-sm" />
                      {scout.company.employeeCountRange}
                    </span>
                  )}
                  {scout.company.websiteUrl && (
                    <a
                      href={scout.company.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1 text-primary-container"
                    >
                      <Icon name="link" className="text-sm" />
                      <span className="group-hover:underline">Webサイト</span>
                    </a>
                  )}
                </div>
              </div>
              {scout.company.description && (
                <p className="text-xs text-outline leading-relaxed">
                  {scout.company.description}
                </p>
              )}
            </div>
          </div>

          <div className="bg-surface-container p-6 rounded-lg mb-6">
            <h4 className="text-base font-semibold text-on-surface mb-3 tracking-normal">
              オファーメッセージ
            </h4>
            <OfferMessage message={scout.message} />
          </div>

          {!isActionable && (
            <StatusNotice status={scout.status} scoutId={scout.id} />
          )}
          {isActionable && confirming && (
            <ConfirmDialog
              kind={confirming}
              scoutId={scout.id}
              onCancel={() => setConfirming(null)}
              onComplete={(next) => {
                onStatusChange(scout.id, next);
                setConfirming(null);
                // 承諾完了後はその場でチャット画面へ遷移する。
                // chat 側の ?scout=<id> deep-link で該当会話が初期選択される。
                if (next === "accepted") {
                  router.push(`/student/messages?scout=${scout.id}`);
                }
              }}
            />
          )}
        </div>

        <JobOverviewCard job={scout.job} />

        {scout.job.description && (
          <JobSection label="業務内容" text={scout.job.description} />
        )}
        {scout.company.culture && (
          <div className="bg-surface-container-lowest p-6 rounded-xl">
            <h5 className="text-base font-semibold text-on-surface mb-3 tracking-normal">
              社風・風土
            </h5>
            <div className="mb-4">
              <ExpandableText
                text={scout.company.culture}
                previewLines={3}
              />
            </div>
            <CulturePhotoGrid companyName={scout.company.name} />
          </div>
        )}
        {scout.job.benefits && (
          <JobSection
            label="福利厚生・魅力"
            text={scout.job.benefits}
            variant="checklist"
          />
        )}

      </div>
      </div>
      {isActionable && (
        <div className="sticky bottom-0 z-20 bg-surface-container-low/95 backdrop-blur-md border-t border-surface-container">
          <div className="max-w-5xl mx-auto px-4 md:px-12 py-2 md:py-3 flex flex-col sm:flex-row gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => setConfirming("accept")}
              className="flex-1 py-2 md:py-3.5 text-sm md:text-base signature-gradient text-white font-bold rounded-lg shadow-lg hover:opacity-90 transition-all inline-flex items-center justify-center gap-2"
            >
              <Icon name="check_circle" className="text-base md:text-lg" />
              承諾する
            </button>
            <button
              type="button"
              onClick={() => setConfirming("decline")}
              className="px-6 md:px-8 py-2 md:py-3.5 text-sm md:text-base bg-rose-50 text-rose-700 font-bold rounded-lg border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition-colors"
            >
              辞退する
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** 社風・風土カード下部に出す職場風景写真。DB 連携前の見た目用。
 *  会社名で seed して同じ会社には同じ並びが出るようにする。
 *  URL は Unsplash の公開写真 ID 直リンク（office/team/workspace 等）。 */
const CULTURE_PHOTOS: ReadonlyArray<{ url: string; caption: string }> = [
  {
    url:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop&auto=format",
    caption: "チームの作業フロア",
  },
  {
    url:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop&auto=format",
    caption: "プロジェクト討議の様子",
  },
  {
    url:
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=600&fit=crop&auto=format",
    caption: "チームランチ",
  },
  {
    url:
      "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=800&h=600&fit=crop&auto=format",
    caption: "オフィスラウンジ",
  },
];

function CulturePhotoGrid({ companyName }: { companyName: string }) {
  // 会社名をハッシュして表示順をシャッフルする（同じ会社には同じ順序）。
  const seed = Array.from(companyName).reduce(
    (acc, ch) => (acc * 31 + ch.charCodeAt(0)) & 0xffffffff,
    0,
  );
  const offset = Math.abs(seed) % CULTURE_PHOTOS.length;
  const rotated = [...CULTURE_PHOTOS, ...CULTURE_PHOTOS].slice(
    offset,
    offset + CULTURE_PHOTOS.length,
  );

  const [index, setIndex] = useState(0);
  const total = rotated.length;
  const current = rotated[index];
  const go = (next: number) => setIndex(((next % total) + total) % total);

  if (!current) return null;
  return (
    <div className="space-y-2">
      <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-surface-container-low">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.caption}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <button
          type="button"
          aria-label="前の写真"
          onClick={() => go(index - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-9 h-9 grid place-items-center transition-colors"
        >
          <Icon name="chevron_left" />
        </button>
        <button
          type="button"
          aria-label="次の写真"
          onClick={() => go(index + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-9 h-9 grid place-items-center transition-colors"
        >
          <Icon name="chevron_right" />
        </button>
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
          {rotated.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1} 枚目を表示`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-white" : "w-1.5 bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>
      <p className="text-xs text-outline text-center">{current.caption}</p>
    </div>
  );
}

/** オファーメッセージ / 業務内容 / 社風・風土 で使う「続きを読む」方式の長文表示。
 *  改行数ではなく実際の表示行数（折り返し含む）で previewLines を超えるときだけ
 *  「続きを読む」を表示する。判定は scrollHeight > clientHeight。 */
function ExpandableText({
  text,
  previewLines,
  textClassName = "text-sm leading-relaxed text-on-surface whitespace-pre-wrap",
}: {
  text: string;
  previewLines: number;
  textClassName?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isOverflow, setIsOverflow] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      // clamp 有効時: 切り詰められていれば scrollHeight > clientHeight になる
      // 展開中は一時的に clamp を外して判定する必要があるが、
      // expanded 時はそもそもボタンで折りたたむだけなので別途判定不要。
      if (!expanded) setIsOverflow(el.scrollHeight - el.clientHeight > 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, previewLines, expanded]);

  const clampStyle: React.CSSProperties | undefined = !expanded
    ? {
        display: "-webkit-box",
        WebkitLineClamp: previewLines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }
    : undefined;

  return (
    <>
      <p ref={ref} className={textClassName} style={clampStyle}>
        {text}
      </p>
      {(isOverflow || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs font-semibold text-primary-container hover:underline"
        >
          {expanded ? "折りたたむ" : "続きを読む"}
        </button>
      )}
    </>
  );
}

function SubjectHeading({ subject }: { subject: string }) {
  // 「【...】 本文」のパターンを分解。マッチしない場合は素のタイトルを出す。
  const m = subject.match(/^【([^】]+)】\s*(.+)$/);
  if (!m) {
    return (
      <h1 className="text-lg md:text-2xl font-extrabold text-primary leading-snug">
        {subject}
      </h1>
    );
  }
  const [, tag, rest] = m;
  return (
    <div className="space-y-2">
      <span className="inline-flex items-center bg-primary-container text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded">
        {tag}
      </span>
      <h1 className="text-lg md:text-2xl font-extrabold text-primary leading-snug">
        {rest}
      </h1>
    </div>
  );
}

function OfferMessage({ message }: { message: string }) {
  return <ExpandableText text={message} previewLines={3} />;
}

function JobSection({
  label,
  text,
  variant = "paragraph",
}: {
  label: string;
  text: string;
  /** "checklist" は改行区切りで各行をチェックボックス項目として描画する。 */
  variant?: "paragraph" | "checklist";
}) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl">
      <h5 className="text-base font-semibold text-on-surface mb-3 tracking-normal">
        {label}
      </h5>
      {variant === "checklist" ? (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          {text
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-on-surface leading-relaxed"
              >
                <Icon
                  name="check_box"
                  filled
                  className="text-base text-secondary shrink-0 mt-[1px]"
                />
                <span>{line}</span>
              </li>
            ))}
        </ul>
      ) : (
        <ExpandableText
          text={text}
          previewLines={5}
          textClassName="text-xs text-on-surface leading-relaxed whitespace-pre-wrap"
        />
      )}
    </div>
  );
}

function JobOverviewCard({ job }: { job: ScoutItem["job"] }) {
  const rows: Array<{ icon: string; label: string; value: string }> = [];
  // ラベルは企業側の求人作成フォーム (feat/company-jobs) に揃える。
  if (job.jobType)
    rows.push({
      icon: "work",
      label: "職種",
      value: job.jobType,
    });
  if (job.jobCategory)
    rows.push({
      icon: "category",
      label: "業種",
      value: job.jobCategory,
    });
  if (job.employmentType)
    rows.push({ icon: "badge", label: "雇用形態", value: job.employmentType });
  if (job.workLocation)
    rows.push({
      icon: "location_on",
      label: "勤務地",
      value: job.workLocation,
    });
  if (job.salaryRange)
    rows.push({ icon: "payments", label: "想定年収", value: job.salaryRange });
  if (job.targetGraduationYears && job.targetGraduationYears.length > 0)
    rows.push({
      icon: "school",
      label: "対象卒業年度",
      value: `${[...job.targetGraduationYears].sort((a, b) => a - b).join(" / ")} 年卒`,
    });

  if (rows.length === 0) return null;

  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl">
      <h5 className="text-base font-semibold text-on-surface mb-4 tracking-normal">
        求人概要
      </h5>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-3">
            <div className="w-8 h-8 shrink-0 rounded-lg bg-surface-container grid place-items-center text-primary-container">
              <Icon name={r.icon} className="text-base" />
            </div>
            <div className="min-w-0 flex-1">
              <dt className="text-[10px] font-bold text-outline tracking-wider uppercase">
                {r.label}
              </dt>
              <dd className="text-xs font-semibold text-on-surface mt-0.5 whitespace-pre-wrap break-words">
                {r.value}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ConfirmDialog({
  kind,
  scoutId,
  onCancel,
  onComplete,
}: {
  kind: "accept" | "decline";
  scoutId: string;
  onCancel: () => void;
  onComplete: (next: ScoutDisplayStatus) => void;
}) {
  const action = kind === "accept" ? acceptScout : declineScout;
  const [state, formAction, isPending] = useActionState<
    ScoutActionState,
    FormData
  >(action, {});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (state.success) {
      onComplete(kind === "accept" ? "accepted" : "declined");
    }
  }, [state.success, kind, onComplete]);

  // Escape で閉じる（処理中は無効）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isPending, onCancel]);

  if (!mounted) return null;

  const isAccept = kind === "accept";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scout-confirm-title"
      className="fixed inset-0 z-70 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="閉じる"
        onClick={() => !isPending && onCancel()}
        className="absolute inset-0 bg-black/50"
      />
      <form
        action={formAction}
        className="relative bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-md p-6"
      >
        <input type="hidden" name="scout_id" value={scoutId} />
        <div className="mb-4">
          <h4
            id="scout-confirm-title"
            className="text-base font-bold text-on-surface mb-1"
          >
            {isAccept
              ? "このスカウトを承諾しますか？"
              : "このスカウトを辞退しますか？"}
          </h4>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {isAccept
              ? "承諾すると企業担当者にあなたのプロフィールが公開され、やり取りが開始されます。"
              : "辞退すると企業に通知され、このスカウトに再度返信することはできません。"}
          </p>
        </div>
        {state.error && (
          <p className="text-xs text-error mb-3 font-semibold">{state.error}</p>
        )}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-6 py-3 bg-surface-container-low text-on-surface-variant font-bold rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isPending}
            className={
              isAccept
                ? "px-6 py-3 signature-gradient text-white font-bold rounded-lg hover:opacity-90 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50"
                : "px-6 py-3 bg-error text-white font-bold rounded-lg hover:opacity-90 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50"
            }
          >
            <Icon name={isAccept ? "check_circle" : "cancel"} />
            {isPending
              ? "処理中..."
              : isAccept
                ? "承諾してメッセージを送る"
                : "辞退する"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function StatusNotice({
  status,
  scoutId,
}: {
  status: ScoutItem["status"];
  scoutId: string;
}) {
  const map: Record<ScoutItem["status"], { icon: string; text: string } | null> =
    {
      new: null,
      read: null,
      accepted: {
        icon: "check_circle",
        text: "このスカウトは既に承諾済みです。メッセージでやり取りを継続してください。",
      },
      declined: {
        icon: "cancel",
        text: "このスカウトは辞退済みです。再度やり取りはできません。",
      },
      expired: {
        icon: "schedule",
        text: "このスカウトは有効期限切れです。応答することはできません。",
      },
    };
  const info = map[status];
  if (!info) return null;
  return (
    <div className="pt-2 space-y-3">
      <div className="bg-surface-container p-4 rounded-lg flex items-start gap-3">
        <Icon name={info.icon} className="text-outline shrink-0 mt-0.5" />
        <p className="text-xs text-on-surface-variant leading-relaxed">
          {info.text}
        </p>
      </div>
      {status === "accepted" && (
        <Link
          href={`/student/messages?scout=${scoutId}`}
          className="w-full py-3.5 signature-gradient text-white font-bold rounded-lg shadow-lg hover:opacity-90 transition-all inline-flex items-center justify-center gap-2"
        >
          <Icon name="chat" />
          メッセージを開く
        </Link>
      )}
    </div>
  );
}

function DetailPlaceholder() {
  return (
    <div className="h-full grid place-items-center p-10">
      <div className="text-center">
        <Icon name="inbox" className="text-outline text-4xl mb-2" />
        <p className="text-sm font-semibold text-on-surface-variant">
          左のリストからスカウトを選択してください
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-24 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-surface-container grid place-items-center mb-4">
        <Icon name="inbox" className="text-outline text-3xl" />
      </div>
      <h2 className="text-lg font-bold text-on-surface mb-1">
        スカウトはまだありません
      </h2>
      <p className="text-xs text-outline">
        プロフィールを公開すると企業からのスカウトが届きます。
      </p>
    </div>
  );
}

function statusEyebrow(status: ScoutItem["status"]): string {
  switch (status) {
    case "new":
      return "未読オファー";
    case "read":
      return "オファー";
    case "accepted":
      return "承諾済み";
    case "declined":
      return "辞退済み";
    case "expired":
      return "期限切れ";
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${hh}:${mm}`;
}
