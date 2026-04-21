import { GlassCard } from "@/features/company/student-profile/glass-card";
import type { ProfileMock } from "@/features/student/profile/mock";

export function OrientationCard({ profile }: { profile: ProfileMock["integratedProfile"] }) {
  const traits = [
    { low: "安定", high: "成長", value: profile.growthStabilityScore },
    { low: "ゼネラリスト", high: "スペシャリスト", value: profile.specialistGeneralistScore },
    { low: "個人", high: "チーム", value: profile.individualTeamScore },
    { low: "ルール重視", high: "裁量", value: profile.autonomyGuidanceScore },
  ];

  return (
    <GlassCard className="p-6 md:p-10">
      <h2 className="text-xl md:text-2xl font-extrabold text-primary mb-2">志向・価値観</h2>
      <p className="text-xs text-on-surface-variant mb-6 md:mb-8">
        行動データから推定したキャリア志向
      </p>
      <div className="space-y-5">
        {traits.map((trait) => {
          if (trait.value == null) {
            return (
              <div key={trait.low}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-bold text-secondary">{trait.low}</span>
                  <span className="text-sm font-bold text-secondary">{trait.high}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-on-surface-variant w-10 text-right">—</span>
                  <div className="flex-1 flex h-6 rounded-full overflow-hidden bg-surface-container" />
                  <span className="text-sm font-extrabold text-on-surface-variant w-10">—</span>
                </div>
              </div>
            );
          }
          const left = 100 - trait.value;
          const right = trait.value;
          return (
            <div key={trait.low}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-bold text-secondary">{trait.low}</span>
                <span className="text-sm font-bold text-secondary">{trait.high}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-primary w-10 text-right">{left}</span>
                <div className="flex-1 flex h-6 rounded-full overflow-hidden">
                  <div
                    className="h-6 transition-all"
                    style={{ width: `${left}%`, backgroundColor: "#e53935" }}
                  />
                  <div
                    className="h-6 transition-all"
                    style={{ width: `${right}%`, backgroundColor: "#1a4b84" }}
                  />
                </div>
                <span className="text-sm font-extrabold text-primary w-10">{right}</span>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
