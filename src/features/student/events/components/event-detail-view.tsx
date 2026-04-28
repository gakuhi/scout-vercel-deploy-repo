import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/shared/utils/cn";
import {
  deriveAvailability,
  type EventAccess,
  type EventDetail,
  type EventLocationKind,
  type EventScheduleItem,
  type EventSpeaker,
} from "../schema";
import { ApplyButton, type ApplyBlockReason } from "./apply-button";
import type { ApplyDefaults } from "./apply-dialog";

const FORMAT_LABEL: Record<EventLocationKind, string> = {
  online: "オンライン",
  offline: "オフライン",
  hybrid: "ハイブリッド",
};

type Props = {
  detail: EventDetail;
  /** 申込フォームの初期値。プロフィール未連携の項目は undefined。 */
  applyDefaults?: ApplyDefaults;
  /** プロフィール未完了。ApplyButton をプロフィール画面への CTA に切り替える。 */
  profileIncomplete?: boolean;
};

export function EventDetailView({
  detail,
  applyDefaults,
  profileIncomplete,
}: Props) {
  return (
    <div className="-mx-6 md:-mx-10 -mt-24 md:-mt-10 md:-mb-16">
      <Hero detail={detail} />
      {/* pb は ApplyFooter (約 76px) ぶんを確保し、最終要素が footer に隠れないようにする。 */}
      <section className="px-6 md:px-8 -mt-16 md:-mt-20 relative z-20 pb-28 md:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          <div className="lg:col-span-8 space-y-6 md:space-y-8">
            <OverviewCard detail={detail} />
            <ContentCard paragraphs={detail.description} />
            {detail.speakers.length > 0 && (
              <SpeakersSection speakers={detail.speakers} />
            )}
          </div>
          <div className="lg:col-span-4 space-y-6 md:space-y-8">
            {detail.schedule.length > 0 && (
              <ScheduleCard schedule={detail.schedule} />
            )}
            {detail.access && <AccessCard access={detail.access} />}
          </div>
        </div>
      </section>
      <ApplyFooter
        detail={detail}
        applyDefaults={applyDefaults}
        profileIncomplete={profileIncomplete}
      />
    </div>
  );
}

function ApplyFooter({
  detail,
  applyDefaults,
  profileIncomplete,
}: {
  detail: EventDetail;
  applyDefaults?: ApplyDefaults;
  profileIncomplete?: boolean;
}) {
  const availability = deriveAvailability(detail);
  const blockReason: ApplyBlockReason =
    availability.status === "full"
      ? "full"
      : availability.status === "closed"
        ? "closed"
        : null;
  return (
    <div className="fixed inset-x-0 bottom-20 md:bottom-0 z-40 bg-surface-container-lowest/95 backdrop-blur border-t border-outline-variant/30 shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
      <div className="px-4 md:px-8 py-3 md:py-4 flex items-center gap-3 md:gap-6 max-w-7xl mx-auto">
        <div className="hidden md:block flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-outline mb-1">
            {detail.dateLabel}
          </p>
          <h3 className="text-xl font-bold text-on-surface truncate">
            {detail.title}
          </h3>
        </div>
        <ApplyButton
          context={{
            eventId: detail.id,
            eventTitle: detail.title,
            eventDateLabel: detail.dateLabel,
            eventLocationLabel: detail.locationLabel,
          }}
          defaults={applyDefaults}
          blockReason={blockReason}
          profileIncomplete={profileIncomplete}
          className="flex-1 md:flex-none signature-gradient text-white px-6 md:px-24 py-3 md:py-7 rounded-lg font-bold text-sm md:text-2xl hover:opacity-90 active:scale-95 transition-all shadow-lg"
        >
          参加を申し込む
        </ApplyButton>
      </div>
    </div>
  );
}

function Hero({ detail }: { detail: EventDetail }) {
  const availability = deriveAvailability(detail);
  return (
    <section className="relative w-full h-[560px] md:h-[640px] flex items-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={detail.heroImageUrl}
          alt=""
          aria-hidden
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-transparent" />
      </div>
      <div className="relative z-10 w-full px-6 md:px-12 pt-16 md:pt-0">
        <div className="flex flex-col gap-5 md:gap-6 max-w-3xl">
          <Link
            href="/student/events"
            className="inline-flex items-center gap-1 self-start text-white/80 hover:text-white text-sm font-medium"
          >
            <Icon name="chevron_left" className="text-[20px]" />
            <span>イベント一覧へ戻る</span>
          </Link>
          <span className="inline-flex self-start items-center px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] uppercase tracking-widest font-bold rounded-full">
            {detail.heroEyebrow}
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {detail.title}
          </h1>
          <div className="flex flex-wrap gap-5 md:gap-8 text-white/90">
            <div className="flex items-center gap-2">
              <Icon
                name="calendar_today"
                className="text-primary-fixed-dim"
              />
              <span className="font-bold">{detail.dateLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="location_on" className="text-primary-fixed-dim" />
              <span className="font-bold">{detail.locationLabel}</span>
            </div>
            {availability.capacity !== null && (
              <div className="flex items-center gap-2">
                <Icon name="group" className="text-primary-fixed-dim" />
                <span className="font-bold">
                  定員 {availability.capacity} 名（
                  {availability.status === "full"
                    ? "満員御礼"
                    : availability.status === "nearly_full"
                      ? "残り少し"
                      : "受付中"}
                  ）
                </span>
              </div>
            )}
            {availability.deadlineLabel && (
              <div className="flex items-center gap-2">
                <Icon name="schedule" className="text-primary-fixed-dim" />
                <span className="font-bold">
                  {availability.status === "closed"
                    ? "申込締切"
                    : `申込締切 ${availability.deadlineLabel}`}
                </span>
              </div>
            )}
            {detail.targetGraduationYear !== null && (
              <div className="flex items-center gap-2">
                <Icon name="school" className="text-primary-fixed-dim" />
                <span className="font-bold">
                  対象: {detail.targetGraduationYear} 年卒
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function OverviewCard({ detail }: { detail: EventDetail }) {
  const showOnlineUrl =
    detail.format !== "offline" && Boolean(detail.onlineUrl);
  return (
    <div className="bg-surface-container-lowest p-6 md:p-10 rounded-xl shadow-sm">
      <h2 className="text-xl md:text-2xl font-bold text-on-surface mb-5 md:mb-6">
        イベント概要
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-6 gap-y-4 text-sm md:text-base">
        <OverviewRow label="開催形式" value={FORMAT_LABEL[detail.format]} />
        <OverviewRow label="開催日時" value={detail.dateTimeRangeLabel} />
        <OverviewRow label="開催場所" value={detail.locationLabel} />
        {showOnlineUrl && (
          <OverviewRow
            label="オンライン URL"
            value={
              <a
                href={detail.onlineUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline break-all"
              >
                {detail.onlineUrl}
              </a>
            }
          />
        )}
        <OverviewRow
          label="定員"
          value={detail.capacity !== null ? `${detail.capacity} 名` : "制限なし"}
        />
        <OverviewRow
          label="申込締切"
          value={detail.applicationDeadlineDateTimeLabel ?? "期限なし"}
        />
        <OverviewRow
          label="対象卒業年度"
          value={
            detail.targetGraduationYear !== null
              ? `${detail.targetGraduationYear} 年卒`
              : "全学年対象"
          }
        />
        <OverviewRow
          label="対象職種"
          value={
            detail.jobTypes.length > 0 ? detail.jobTypes.join(" / ") : "全職種対象"
          }
        />
      </dl>
    </div>
  );
}

function OverviewRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <>
      <dt className="text-[11px] uppercase font-bold tracking-wider text-on-surface-variant pt-0.5">
        {label}
      </dt>
      <dd className="text-on-surface leading-relaxed">{value}</dd>
    </>
  );
}

function ContentCard({ paragraphs }: { paragraphs: string[] }) {
  if (paragraphs.length === 0) return null;
  return (
    <div className="bg-surface-container-lowest p-6 md:p-10 rounded-xl shadow-sm">
      <h2 className="text-xl md:text-2xl font-bold text-on-surface mb-5 md:mb-6">
        イベント内容
      </h2>
      <div className="space-y-4 text-on-surface-variant leading-relaxed text-sm md:text-base">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
}

function SpeakersSection({ speakers }: { speakers: EventSpeaker[] }) {
  return (
    <div className="space-y-5 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-on-surface px-2">
        登壇者紹介
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {speakers.map((speaker) => (
          <SpeakerCard key={speaker.id} speaker={speaker} />
        ))}
      </div>
    </div>
  );
}

function SpeakerCard({ speaker }: { speaker: EventSpeaker }) {
  return (
    <div className="bg-surface-container-low p-5 md:p-6 rounded-xl flex gap-4 md:gap-6 items-start">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={speaker.imageUrl}
        alt=""
        aria-hidden
        className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover shadow-sm shrink-0"
      />
      <div className="min-w-0">
        <h3 className="text-base md:text-lg font-bold text-on-surface">
          {speaker.name}
        </h3>
        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-2">
          {speaker.role}
        </p>
        <p className="text-sm text-on-surface-variant leading-snug">
          {speaker.bio}
        </p>
      </div>
    </div>
  );
}

function ScheduleCard({ schedule }: { schedule: EventScheduleItem[] }) {
  return (
    <div className="bg-primary text-white p-6 md:p-8 rounded-xl">
      <h2 className="text-lg md:text-xl font-bold mb-6 md:mb-8 border-b border-white/10 pb-4">
        タイムスケジュール
      </h2>
      <div className="space-y-6 md:space-y-8">
        {schedule.map((item) => (
          <ScheduleRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function ScheduleRow({ item }: { item: EventScheduleItem }) {
  return (
    <div className="relative pl-6 border-l-2 border-primary-fixed-dim/30">
      <div
        className={cn(
          "absolute -left-[9px] top-0 w-4 h-4 rounded-full",
          item.emphasized ? "bg-primary-fixed-dim" : "bg-primary-fixed-dim/50",
        )}
      />
      <div className="text-[10px] uppercase font-bold text-primary-fixed-dim mb-1 tracking-wider">
        {item.timeRange}
      </div>
      <div className="font-bold">{item.title}</div>
      {item.caption && (
        <div className="text-sm text-white/70 mt-1">{item.caption}</div>
      )}
    </div>
  );
}

function AccessCard({ access }: { access: EventAccess }) {
  return (
    <div className="bg-surface-container-high p-6 md:p-8 rounded-xl space-y-5 md:space-y-6">
      <div className="text-2xl md:text-3xl font-extrabold tracking-[0.15em] text-on-surface">
        ACCESS
      </div>
      <div className="w-full h-52 md:h-64 bg-surface-container-highest rounded-lg overflow-hidden">
        <iframe
          src={access.mapEmbedUrl}
          title={`${access.venue} の地図`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full border-0"
        />
      </div>
      <div>
        <div className="text-on-surface font-bold">{access.address}</div>
        <div className="text-sm text-on-surface-variant">{access.venue}</div>
      </div>
    </div>
  );
}
