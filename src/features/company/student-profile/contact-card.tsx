import { GlassCard } from "@/features/company/student-profile/glass-card";

export function ContactCard({ email, phone }: { email: string; phone: string }) {
  return (
    <GlassCard className="p-6 md:p-8">
      <h3 className="text-base md:text-lg font-extrabold text-primary mb-4">
        連絡先
      </h3>
      <div className="space-y-3">
        <div className="min-h-10 bg-surface-container rounded-lg flex items-center px-4 py-2 text-xs text-on-surface-variant break-all">
          {email || "未設定"}
        </div>
        <div className="min-h-10 bg-surface-container rounded-lg flex items-center px-4 py-2 text-xs text-on-surface-variant break-all">
          {phone || "未設定"}
        </div>
      </div>
    </GlassCard>
  );
}
