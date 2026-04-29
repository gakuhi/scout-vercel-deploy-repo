"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Tag } from "@/components/ui/tag";
import { togglePublishAction, deleteJobAction } from "@/features/company/app/jobs/actions/toggle-publish";
import type { JobListItem } from "@/features/company/app/jobs/queries";

type JobListViewProps = {
  jobs: JobListItem[];
  isEditable: boolean;
};

type FilterTab = "all" | "published" | "draft";

export function JobListView({ jobs, isEditable }: JobListViewProps) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const filteredJobs = jobs.filter((job) => {
    if (filter === "published" && !job.isPublished) return false;
    if (filter === "draft" && job.isPublished) return false;
    if (search.trim()) {
      return job.title.toLowerCase().includes(search.trim().toLowerCase());
    }
    return true;
  });

  const publishedCount = jobs.filter((j) => j.isPublished).length;
  const draftCount = jobs.filter((j) => !j.isPublished).length;

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "すべて", count: jobs.length },
    { key: "published", label: "掲載中", count: publishedCount },
    { key: "draft", label: "下書き", count: draftCount },
  ];

  return (
    <div>
      <div className="flex items-end justify-between mb-10">
        <div>
          <span className="text-[10px] font-bold text-tertiary-container uppercase tracking-[0.2em] mb-3 block">
            Job Listings Management
          </span>
          <h1 className="text-5xl font-extrabold text-primary-container leading-none tracking-tight">
            求人管理
          </h1>
        </div>
        {isEditable && (
          <Link
            href="/company/jobs/new"
            className="inline-flex items-center gap-2 signature-gradient text-white text-sm font-bold px-6 py-3 rounded-lg shadow-lg hover:opacity-90 transition-opacity"
          >
            <Icon name="add" />
            新規求人作成
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="article" label="掲載中の求人" value={publishedCount} />
        <StatCard icon="edit_note" label="下書き" value={draftCount} />
        <StatCard icon="list_alt" label="合計" value={jobs.length} />
        <StatCard
          icon="calendar_today"
          label="最新更新"
          value={
            jobs[0]?.createdAt
              ? new Intl.DateTimeFormat("ja-JP", {
                  month: "short",
                  day: "numeric",
                }).format(new Date(jobs[0].createdAt))
              : "—"
          }
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
          placeholder="求人タイトルで検索..."
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

      {/* Job List */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-20">
          <Icon name="work_off" className="text-outline-variant text-5xl mb-4" />
          <p className="text-outline font-medium">
            {filter === "all"
              ? "求人がまだ作成されていません"
              : filter === "published"
                ? "掲載中の求人はありません"
                : "下書きの求人はありません"}
          </p>
          {isEditable && filter === "all" && (
            <Link
              href="/company/jobs/new"
              className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-primary-container hover:underline"
            >
              <Icon name="add" />
              新しく求人を作成する
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isEditable={isEditable}
            />
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

function JobCard({
  job,
  isEditable,
}: {
  job: JobListItem;
  isEditable: boolean;
}) {
  const [isToggling, setIsToggling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleTogglePublish() {
    const message = job.isPublished
      ? `「${job.title}」を非公開にしますか？`
      : `「${job.title}」を公開しますか？`;
    if (!confirm(message)) return;
    setActionError(null);
    setIsToggling(true);
    const result = await togglePublishAction(job.id, !job.isPublished);
    setIsToggling(false);
    if (result.error) setActionError(result.error);
  }

  async function handleDelete() {
    if (!confirm(`「${job.title}」を削除しますか？`)) return;
    setActionError(null);
    const result = await deleteJobAction(job.id);
    if (result.error) setActionError(result.error);
  }

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
              href={`/company/jobs/${job.id}/edit`}
              className="text-lg font-bold text-primary-container hover:underline truncate"
            >
              {job.title}
            </Link>
            {job.isPublished ? (
              <Tag variant="secondary">掲載中</Tag>
            ) : (
              <Tag variant="neutral">下書き</Tag>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-outline">
            {job.employmentType && (
              <span className="flex items-center gap-1">
                <Icon name="badge" className="text-sm" />
                {job.employmentType}
              </span>
            )}
            {job.salaryRange && (
              <span className="flex items-center gap-1">
                <Icon name="payments" className="text-sm" />
                {job.salaryRange}
              </span>
            )}
            {job.workLocation && (
              <span className="flex items-center gap-1">
                <Icon name="location_on" className="text-sm" />
                {job.workLocation}
              </span>
            )}
            {job.jobCategory && (
              <span className="flex items-center gap-1">
                <Icon name="category" className="text-sm" />
                {job.jobCategory}
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
              {job.isPublished ? "非公開にする" : "公開する"}
            </button>
            <Link
              href={`/company/jobs/${job.id}/edit`}
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
