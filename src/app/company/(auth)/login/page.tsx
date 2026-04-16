import { LoginForm } from "@/features/company/auth/components/login-form";

export const metadata = {
  title: "サインイン | Executive Monograph",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface relative overflow-hidden">
      <main className="w-full max-w-6xl flex flex-col md:flex-row items-stretch bg-surface-container-lowest rounded-xl overflow-hidden shadow-2xl relative z-10">
        <section className="hidden md:flex md:w-1/2 relative bg-primary items-center justify-center overflow-hidden">
          <div className="absolute inset-0 signature-gradient opacity-90" />
          <div className="relative z-10 p-12 flex flex-col justify-between h-full w-full">
            <div>
              <h1 className="text-white text-3xl font-extrabold tracking-tighter mb-2">
                Executive Monograph
              </h1>
              <div className="h-1 w-12 bg-on-tertiary-container mb-8" />
            </div>
            <div className="max-w-md">
              <p className="text-primary-fixed text-sm font-medium uppercase tracking-widest mb-4">
                The Recruitment Authority
              </p>
              <h2 className="text-white text-5xl font-extrabold leading-tight mb-6">
                次世代の
                <br />
                エグゼクティブ・サーチを。
              </h2>
              <p className="text-primary-fixed/70 text-lg leading-relaxed">
                妥協のない採用体験。最高峰のタレントと、それを求める企業を、洗練されたインターフェースで繋ぎます。
              </p>
            </div>
            <div className="flex items-center gap-4 text-white/50 text-xs font-medium uppercase tracking-widest">
              <span>Authenticity</span>
              <span className="w-1 h-1 bg-white/30 rounded-full" />
              <span>Exclusivity</span>
              <span className="w-1 h-1 bg-white/30 rounded-full" />
              <span>Performance</span>
            </div>
          </div>
        </section>
        <section className="flex-1 flex flex-col justify-center items-center p-8 md:p-16 lg:p-24 bg-surface-container-lowest">
          <LoginForm />
        </section>
      </main>
      <div className="fixed -bottom-32 -left-32 w-96 h-96 bg-primary-container/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed -top-32 -right-32 w-96 h-96 bg-tertiary-container/5 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
}
