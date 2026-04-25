export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/onboarding-bg.png"
          alt=""
          className="w-full h-full object-cover grayscale-[20%]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(0, 31, 65, 0.55) 0%, rgba(26, 75, 132, 0.4) 100%)",
          }}
        />
      </div>
      {/* Content */}
      <main className="relative z-10 flex items-center justify-center min-h-screen px-4 py-10">
        <div className="w-full max-w-3xl bg-surface-container-lowest shadow-lg rounded-xl p-8 md:p-10">
          {children}
        </div>
      </main>
      {/* Subtle Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 bg-[url('/images/noise.svg')]" />
    </div>
  );
}
