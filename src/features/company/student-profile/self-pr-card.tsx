import { GlassCard } from "@/features/company/student-profile/glass-card";

export function SelfPrCard({ bio }: { bio: string }) {
  return (
    <GlassCard className="p-6 md:p-10">
      <h2 className="text-xl md:text-2xl font-extrabold text-primary mb-4 md:mb-6">自己PR</h2>
      <p className="text-sm md:text-base text-on-surface-variant leading-relaxed">
        {bio || "自己紹介文が未設定です。プロフィール編集から追加してください。"}
      </p>
    </GlassCard>
  );
}
