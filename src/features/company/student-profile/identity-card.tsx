import { Icon } from "@/components/ui/icon";
import { GlassCard } from "@/features/company/student-profile/glass-card";
import type { ProfileMock } from "@/features/student/profile/mock";

export function IdentityCard({
  data,
  hidePersonalInfo = false,
}: {
  data: ProfileMock;
  hidePersonalInfo?: boolean;
}) {
  return (
    <GlassCard className="p-6 md:p-8 flex flex-col items-center text-center">
      <div className="mb-4 md:mb-6">
        {data.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.profileImageUrl}
            alt={data.name}
            className="w-24 h-24 md:w-32 md:h-32 rounded-xl object-cover border-4 border-primary/10"
          />
        ) : hidePersonalInfo ? (
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-surface-container-high grid place-items-center border-4 border-primary/10">
            <Icon name="person" className="text-outline text-5xl md:text-6xl" />
          </div>
        ) : (
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-primary-container grid place-items-center text-3xl md:text-4xl font-extrabold text-white border-4 border-primary/10">
            {data.avatarInitials}
          </div>
        )}
      </div>
      {!hidePersonalInfo && (
        <h1 className="text-xl md:text-2xl font-extrabold text-primary mb-1 break-words">{data.name}</h1>
      )}
      <p className="text-xs md:text-sm text-on-surface-variant mb-4 md:mb-6">
        {data.graduationYear != null ? `${data.graduationYear}年卒` : "卒業年度未設定"}
      </p>
      <div className="w-full space-y-3 text-left">
        <InfoRow icon="school" label={data.university || "未設定"} />
        <InfoRow icon="menu_book" label={buildAcademicLabel(data.faculty, data.department)} />
        <InfoRow icon="location_on" label={data.prefecture || "未設定"} />
        <InfoRow icon="psychology" label={buildMbtiLabel(data.mbtiTypeCode, data.mbtiTypeName)} />
      </div>
    </GlassCard>
  );
}

function buildAcademicLabel(faculty: string, department: string): string {
  const parts = [faculty, department].filter((v) => v.length > 0);
  return parts.length > 0 ? parts.join(" / ") : "未設定";
}

function buildMbtiLabel(code: string | null, name: string | null): string {
  if (code && name) return `性格タイプ：${code}（${name}）`;
  return "性格タイプ：未設定";
}

function InfoRow({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-on-surface-variant">
      <Icon name={icon} className="text-primary" />
      <span>{label}</span>
    </div>
  );
}
