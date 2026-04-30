import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "@/features/company/auth/components/login-form";

export const metadata = {
  title: "サインイン | ScoutLink",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface">
      <main className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl p-8 md:p-12">
        <header className="mb-12 flex flex-col items-center gap-4">
          <Image
            src="/logos/black.png"
            alt="ScoutLink"
            width={1466}
            height={243}
            priority
            className="h-10 w-auto"
          />
          <h1 className="text-sm font-bold text-on-surface tracking-tight">
            採用担当者ログイン
          </h1>
        </header>
        <Suspense>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
