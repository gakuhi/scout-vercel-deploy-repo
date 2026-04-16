import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata = {
  title: "新しいパスワードを設定 | Executive Monograph",
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface">
      <main className="w-full max-w-md bg-surface-container-lowest rounded-xl p-8 md:p-16 shadow-2xl">
        <ResetPasswordForm />
      </main>
    </div>
  );
}
