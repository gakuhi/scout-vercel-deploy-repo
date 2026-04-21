import { GlassCard } from "@/features/company/student-profile/glass-card";

export function SkillsCard({ skills, strengths }: { skills: string[]; strengths: string[] }) {
  const allSkills = [...strengths, ...skills];

  if (allSkills.length === 0) {
    return (
      <GlassCard className="p-6 md:p-10">
        <h2 className="text-xl md:text-2xl font-extrabold text-primary mb-4 md:mb-8">
          専門スキル
        </h2>
        <p className="text-sm md:text-base text-on-surface-variant">
          スキル情報はまだありません。4プロダクト連携後に自動生成されます。
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6 md:p-10">
      <h2 className="text-xl md:text-2xl font-extrabold text-primary mb-4 md:mb-8">
        専門スキル
      </h2>
      <div className="flex flex-wrap gap-2 md:gap-3">
        {strengths.map((s) => (
          <span
            key={s}
            className="px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-xs font-bold rounded-lg shadow-sm text-white bg-primary-container"
          >
            {s}
          </span>
        ))}
        {skills.map((s) => (
          <span
            key={s}
            className="px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-xs font-bold rounded-lg shadow-sm text-white bg-secondary"
          >
            {s}
          </span>
        ))}
      </div>
    </GlassCard>
  );
}
