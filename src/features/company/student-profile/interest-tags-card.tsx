import { Eyebrow } from "@/components/ui/tag";
import { GlassCard } from "@/features/company/student-profile/glass-card";
import {
  industryLabels,
  jobCategoryLabels,
  type IndustryCategory,
  type JobCategory,
} from "@/features/student/profile/mock";

export function InterestTagsCard({
  industries,
  jobTypes,
}: {
  industries: IndustryCategory[];
  jobTypes: JobCategory[];
}) {
  return (
    <GlassCard className="p-6 md:p-10">
      <h2 className="text-xl md:text-2xl font-extrabold text-primary mb-4 md:mb-6">
        興味・関心
      </h2>
      <div className="space-y-6">
        <div>
          <Eyebrow className="mb-3">興味業界 Top5（関心度順）</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {industries.map((industry, i) => (
              <span
                key={industry}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm text-white ${
                  i === 0
                    ? "bg-primary-container"
                    : i === 1
                      ? "bg-surface-tint"
                      : i === 2
                        ? "bg-outline"
                        : i === 3
                          ? "bg-outline/70"
                          : "bg-outline-variant"
                }`}
              >
                {i + 1}. {industryLabels[industry]}
              </span>
            ))}
          </div>
        </div>
        <div>
          <Eyebrow className="mb-3">興味職種</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {jobTypes.map((job) => (
              <span
                key={job}
                className="bg-surface-container-lowest px-3 py-1.5 rounded-lg text-xs font-bold text-primary-container shadow-sm soft-border"
              >
                {jobCategoryLabels[job]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
