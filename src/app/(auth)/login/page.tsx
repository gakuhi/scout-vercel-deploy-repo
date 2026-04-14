import { LoginPage } from "@/features/auth";

export const metadata = {
  title: "ログイン | Scout",
};

export default async function Login(props: {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const searchParams = await props.searchParams;

  const errorMessages: Record<string, string> = {
    line_auth_failed: "LINE認証に失敗しました。もう一度お試しください。",
    unauthorized: "アクセス権限がありません。",
    session_failed: "セッションの作成に失敗しました。もう一度お試しください。",
  };

  const error = searchParams.error
    ? (errorMessages[searchParams.error] ?? searchParams.error)
    : undefined;

  return <LoginPage error={error} />;
}
