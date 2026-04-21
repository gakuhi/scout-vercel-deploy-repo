import { AbilityRadarCard } from "@/features/company/student-profile/ability-radar-card";
import { ActivityCard } from "@/features/company/student-profile/activity-card";
import { AiSummaryCard } from "@/features/company/student-profile/ai-summary-card";
import { ContactCard } from "@/features/company/student-profile/contact-card";
import { IdentityCard } from "@/features/company/student-profile/identity-card";
import { InterestTagsCard } from "@/features/company/student-profile/interest-tags-card";
import { OrientationCard } from "@/features/company/student-profile/orientation-card";
import { SelfPrCard } from "@/features/company/student-profile/self-pr-card";
import { SkillsCard } from "@/features/company/student-profile/skills-card";
import type { ProfileMock } from "@/features/student/profile/mock";

type StudentProfileProps = {
  data: ProfileMock;
};

export function StudentProfile({ data }: StudentProfileProps) {
  const profile = data.integratedProfile;

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-12 gap-4 md:gap-8">
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 md:gap-6">
        <IdentityCard data={data} />
        <ContactCard email={data.email} phone={data.phone} />
      </div>
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-4 md:gap-8">
        <AiSummaryCard summary={profile.summary} />
        <SelfPrCard bio={data.bio} />
        <SkillsCard skills={profile.skills} strengths={profile.strengths} />
        <AbilityRadarCard profile={profile} />
        <OrientationCard profile={profile} />
        <InterestTagsCard
          industries={profile.interestedIndustries}
          jobTypes={profile.interestedJobTypes}
        />
        <ActivityCard score={profile.activityVolumeScore} />
      </div>
    </div>
  );
}
