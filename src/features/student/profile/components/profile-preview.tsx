import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { GlassCard } from "@/features/company/student-profile/glass-card";
import { StudentProfile } from "@/features/company/student-profile/student-profile";
import type { ProfileMock } from "@/features/student/profile/mock";

type ProfilePreviewProps = {
  data: ProfileMock;
};

export function ProfilePreview({ data }: ProfilePreviewProps) {
  if (!data.isProfilePublic) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <BackgroundLayer />
        <PreviewBanner />
        <main className="relative z-10 pt-10 md:pt-16 pb-20 px-6 flex items-center justify-center min-h-screen">
          <NotPublicNotice />
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <BackgroundLayer />
      <PreviewBanner />
      <main className="relative z-10 pt-10 md:pt-16 pb-20 px-4 md:px-6">
        <StudentProfile data={data} />
        <footer className="mt-16 text-center text-xs text-white/60 tracking-wider">
          © {new Date().getFullYear()} SCOUT — Professional Recruitment Platform
        </footer>
      </main>
    </div>
  );
}

function NotPublicNotice() {
  return (
    <GlassCard className="p-6 md:p-10 max-w-lg text-center">
      <Icon name="visibility_off" className="text-4xl md:text-5xl text-primary mb-4 block" />
      <h2 className="text-xl md:text-2xl font-extrabold text-primary mb-3">
        プロフィールは非公開です
      </h2>
      <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed mb-6">
        公開設定がオフのため、企業からは表示されません。
        <br />
        プロフィール編集画面で公開設定をオンにすると、企業があなたを検索・スカウトできるようになります。
      </p>
      <Link
        href="/student/profile/edit"
        className="inline-block bg-primary-container text-white px-6 py-3 rounded-full font-bold hover:opacity-90 active:scale-95 transition-all text-sm"
      >
        プロフィール編集へ
      </Link>
    </GlassCard>
  );
}

function BackgroundLayer() {
  return (
    <div
      // PC ではサイドバー分（左 256px）避けて表示する
      className="fixed top-0 right-0 bottom-0 left-0 md:left-64 z-0"
      style={{
        background:
          "linear-gradient(135deg, rgba(0, 31, 65, 0.95) 0%, rgba(26, 75, 132, 0.85) 100%)",
      }}
    />
  );
}

function PreviewBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 md:left-64 z-[60] bg-tertiary-container text-tertiary-fixed flex items-center justify-between gap-2 px-4 md:px-6 py-2 shadow-md">
      <div className="flex items-center gap-2 shrink-0">
        <Icon name="visibility" className="text-sm" />
        <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase">
          Preview Mode
        </span>
      </div>
      <div className="flex-1 text-center text-xs font-medium hidden md:block">
        企業に表示されるあなたのプロフィールを確認しています
      </div>
      <Link
        href="/student/profile"
        className="bg-white text-tertiary-container px-3 md:px-4 py-1.5 rounded-full font-bold hover:opacity-90 active:scale-95 transition-all text-[10px] md:text-xs whitespace-nowrap shrink-0"
      >
        プレビューを終了
      </Link>
    </div>
  );
}
