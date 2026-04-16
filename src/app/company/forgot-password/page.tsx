import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata = {
  title: "パスワードをリセット | Executive Monograph",
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface">
      <main className="w-full max-w-md bg-surface-container-lowest rounded-xl p-8 md:p-16 shadow-2xl">
        <ForgotPasswordForm />
      </main>
    </div>
  );
}
