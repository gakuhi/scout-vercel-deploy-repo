import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Eyebrow } from "@/components/ui/tag";
import type { IntegratedProfile, ProfileMock } from "@/features/student/profile/mock";
import { industryLabels, jobCategoryLabels } from "@/features/student/profile/mock";

type ProfileViewProps = {
  data: ProfileMock;
};

export function ProfileView({ data }: ProfileViewProps) {
  const profile = data.integratedProfile;

  return (
    <div className="space-y-10">
      <HeroSection data={data} />

      <div className="space-y-6">
        <SummaryCard profile={profile} />
        <AbilityRadarCard profile={profile} />
        <OrientationCard profile={profile} />
        <InterestTagsCard profile={profile} />
        <ActivityCard profile={profile} />
        <BioCard bio={data.bio} />
        <ProductSyncSection counts={data.productCounts} />
      </div>
    </div>
  );
}

/* ─── Hero ─── */

function HeroSection({ data }: { data: ProfileMock }) {
  return (
    <section className="relative rounded-2xl md:rounded-3xl overflow-hidden shadow-sm">
      <div
        className="h-48 md:h-72 w-full bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(0,31,65,0.85) 0%, rgba(0,31,65,0.4) 50%, rgba(248,249,251,0) 100%), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2070')",
          backgroundPosition: "center 30%",
        }}
      />
      <div className="px-4 md:px-8 pb-6 md:pb-10 relative z-10">
        <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
          <div className="relative -mt-16 md:-mt-20">
            {data.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.profileImageUrl}
                alt={data.name}
                className="w-24 h-24 md:w-40 md:h-40 rounded-xl md:rounded-2xl border-4 border-surface-container-lowest object-cover shadow-xl"
              />
            ) : (
              <div className="w-24 h-24 md:w-40 md:h-40 rounded-xl md:rounded-2xl border-4 border-surface-container-lowest bg-primary-container grid place-items-center text-2xl md:text-4xl font-extrabold text-white shadow-xl">
                {data.avatarInitials}
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-3 md:gap-4 md:pt-2 min-w-0">
            <div>
              <h1 className="text-xl md:text-3xl font-extrabold tracking-tight text-on-surface">
                {data.name}
              </h1>
              <p className="mt-1 text-xs md:text-sm font-medium text-secondary">
                {data.university} / {data.faculty} / {data.graduationYear}
                年卒業予定
              </p>
            </div>
            <div className="flex gap-2 md:gap-3 w-full md:w-auto">
              <Link href="/student/profile/edit" className="flex-1 md:flex-none">
                <button className="w-full px-4 md:px-8 py-2.5 md:py-3 signature-gradient text-white text-sm md:text-base font-bold rounded-lg transition-all active:scale-95 shadow-lg shadow-primary-container/20">
                  プロフィール編集
                </button>
              </Link>
              <Link
                href="/student/profile/preview"
                className="flex-1 md:flex-none"
              >
                <button className="w-full px-4 md:px-8 py-2.5 md:py-3 signature-gradient text-white text-sm md:text-base font-bold rounded-lg transition-all active:scale-95 shadow-lg shadow-primary-container/20">
                  企業向けプレビュー
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── E. 人物要約 ─── */

function SummaryCard({ profile }: { profile: IntegratedProfile }) {
  return (
    <Card className="p-5 md:p-8">
      <div className="flex items-start justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary">AI統合プロフィール</h2>
        <Icon name="insights" className="text-4xl text-primary-container/20" />
      </div>
      <p className="text-sm leading-relaxed text-on-surface-variant mb-6">
        {profile.summary}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-surface-container-low rounded-lg">
          <Eyebrow className="mb-2">強み・特性</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {profile.strengths.map((s) => (
              <span
                key={s}
                className="bg-primary-container text-white px-3 py-1 rounded text-xs font-bold shadow-sm"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="p-4 bg-surface-container-low rounded-lg">
          <Eyebrow className="mb-2">スキル</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((s) => (
              <span
                key={s}
                className="bg-surface-container-lowest px-3 py-1 rounded text-xs font-bold text-primary-container shadow-sm"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ─── B. 能力スコア — レーダーチャート ─── */

function AbilityRadarCard({ profile }: { profile: IntegratedProfile }) {
  const axes = [
    { key: "logicalThinking", label: "論理的思考力", value: profile.logicalThinkingScore, angle: -90 },
    { key: "communication", label: "コミュニケーション力", value: profile.communicationScore, angle: 0 },
    { key: "writingSkill", label: "文章表現力", value: profile.writingSkillScore, angle: 90 },
    { key: "leadership", label: "リーダーシップ", value: profile.leadershipScore, angle: 180 },
  ];

  return (
    <Card className="p-5 md:p-8">
      <h2 className="text-xl md:text-2xl font-bold text-primary mb-2">能力スコア</h2>
      <p className="text-xs text-on-surface-variant mb-8">
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
    </Card>
  );
}


/* ─── A. 志向スコア — スペクトラムバー ─── */

function OrientationCard({ profile }: { profile: IntegratedProfile }) {
  const traits = [
    { low: "安定", high: "成長", value: profile.growthStabilityScore },
    { low: "ゼネラリスト", high: "スペシャリスト", value: profile.specialistGeneralistScore },
    { low: "個人", high: "チーム", value: profile.individualTeamScore },
    { low: "ルール重視", high: "裁量", value: profile.autonomyGuidanceScore },
  ];

  return (
    <Card className="p-5 md:p-8">
      <h2 className="text-xl md:text-2xl font-bold text-primary mb-2">志向・価値観</h2>
      <p className="text-xs text-on-surface-variant mb-8">
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
    </Card>
  );
}

/* ─── D. 興味タグ ─── */

function InterestTagsCard({ profile }: { profile: IntegratedProfile }) {
  return (
    <Card className="p-5 md:p-8">
      <h2 className="text-xl md:text-2xl font-bold text-primary mb-6">興味・関心</h2>
      <div className="space-y-6">
        <div>
          <Eyebrow className="mb-3">興味業界 Top5（関心度順）</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {profile.interestedIndustries.map((industry, i) => (
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
            {profile.interestedJobTypes.map((job) => (
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
    </Card>
  );
}

/* ─── C. 活動量スコア ─── */

function ActivityCard({ profile }: { profile: IntegratedProfile }) {
  const score = profile.activityVolumeScore;
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-5">
        <Icon name="local_fire_department" className="text-primary-container" />
        <h3 className="font-bold text-primary">就活活動量</h3>
      </div>
      <div className="flex items-end gap-2 mb-3">
        <span className="text-4xl font-extrabold text-primary">{score != null ? score : "—"}</span>
        {score != null && <span className="text-sm text-on-surface-variant font-medium pb-1">/ 100</span>}
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
    </Card>
  );
}

/* ─── 自己紹介文 ─── */

function BioCard({ bio }: { bio: string }) {
  return (
    <Card className="p-5 md:p-8">
      <h2 className="text-xl md:text-2xl font-bold text-primary mb-6">自己紹介文</h2>
      <div className="relative pl-6 border-l-2 border-primary-container/15">
        <span
          aria-hidden
          className="absolute top-0 left-2 -translate-y-2 text-5xl text-primary-container/10 font-serif select-none leading-none"
        >
          &ldquo;
        </span>
        <p className="text-base leading-loose text-on-surface-variant italic">
          {bio}
        </p>
      </div>
    </Card>
  );
}

/* ─── プロダクト同期 ─── */

function ProductSyncSection({ counts }: { counts: ProfileMock["productCounts"] }) {
  return (
    <section>
      <h2 className="text-xl md:text-2xl font-bold text-primary mb-6">各プロダクト同期データ</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {counts.map((item) => (
          <Card key={item.label} className="transition-transform hover:-translate-y-1">
            <Icon name={item.icon} filled className="text-primary-container mb-4 block text-2xl" />
            <div className="text-2xl font-extrabold text-primary">
              {item.value.toString().padStart(2, "0")}
            </div>
            <Eyebrow className="mt-1">{item.label}</Eyebrow>
          </Card>
        ))}
      </div>
    </section>
  );
}

