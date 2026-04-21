import { Icon } from "@/components/ui/icon";
import { GlassCard } from "@/features/company/student-profile/glass-card";

export function ActivityCard({ score }: { score: number | null }) {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3 mb-5">
        <Icon name="local_fire_department" className="text-primary-container" />
        <h3 className="font-bold text-primary">就活活動量</h3>
      </div>
      <div className="flex items-end gap-2 mb-3">
        <span className="text-4xl font-extrabold text-primary">
          {score != null ? score : "—"}
        </span>
        {score != null && (
          <span className="text-sm text-on-surface-variant font-medium pb-1">/ 100</span>
        )}
      </div>
      <div className="w-full bg-surface-container rounded-full h-2.5 mb-3">
        <div
          className="signature-gradient h-2.5 rounded-full transition-all"
          style={{ width: `${score ?? 0}%` }}
        />
      </div>
      <p className="text-[11px] text-on-surface-variant leading-relaxed">
        4プロダクト横断の月間アクション数から算出した相対スコアです。
      </p>
    </GlassCard>
  );
}
