import { GlassCard } from "@/features/company/student-profile/glass-card";
import type { ProfileMock } from "@/features/student/profile/mock";

export function AbilityRadarCard({ profile }: { profile: ProfileMock["integratedProfile"] }) {
  const axes = [
    { key: "logicalThinking", label: "論理的思考力", value: profile.logicalThinkingScore },
    { key: "communication", label: "コミュニケーション力", value: profile.communicationScore },
    { key: "writingSkill", label: "文章表現力", value: profile.writingSkillScore },
    { key: "leadership", label: "リーダーシップ", value: profile.leadershipScore },
  ];

  return (
    <GlassCard className="p-6 md:p-10">
      <h2 className="text-xl md:text-2xl font-extrabold text-primary mb-2">能力スコア</h2>
      <p className="text-xs text-on-surface-variant mb-6 md:mb-8">
        4プロダクトの行動データから算出（0-100）
      </p>
      <div className="space-y-5">
        {axes.map((axis) => (
          <div key={axis.key}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-bold text-secondary">{axis.label}</span>
              <span className="text-sm font-extrabold text-primary">
                {axis.value != null ? axis.value : "—"}
              </span>
            </div>
            <div className="w-full bg-surface-container rounded-full h-3">
              <div
                className="signature-gradient h-3 rounded-full transition-all"
                style={{ width: `${axis.value ?? 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
