"use client";

import { LineLoginButton } from "./LineLoginButton";

export function LoginPage({ error }: { error?: string }) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-8">
      {/* ヘッダー */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Scout</h1>
        <p className="mt-2 text-sm text-gray-600">
          ログインまたは新規登録してください
        </p>
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* LINE ログイン */}
      <LineLoginButton />

      {/* フッター */}
      <p className="text-center text-xs text-gray-400">
        ログインすることで、利用規約およびプライバシーポリシーに同意したものとみなします。
      </p>
    </div>
  );
}
