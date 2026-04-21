import { Icon } from "@/components/ui/icon";
import { Eyebrow } from "@/components/ui/tag";
import { GlassCard } from "@/features/company/student-profile/glass-card";

export function AiSummaryCard({ summary }: { summary: string }) {
  return (
    <GlassCard className="p-6 md:p-10">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="auto_awesome" className="text-primary" />
        <Eyebrow>AI統合プロフィール</Eyebrow>
      </div>
      <h2 className="text-xl md:text-2xl font-extrabold text-primary mb-4 md:mb-6">人物要約</h2>
      <p className="text-sm md:text-base text-on-surface-variant leading-relaxed">{summary}</p>
    </GlassCard>
  );
}
