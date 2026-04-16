"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import {
  forgotPasswordAction,
  type ForgotPasswordState,
} from "@/features/auth/actions/forgot-password";

const initialState: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    initialState,
  );

  if (state.success) {
    return (
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-6 text-center">
          <Icon
            name="mark_email_read"
            className="text-5xl text-primary-container"
          />
          <h3 className="text-on-surface text-2xl font-extrabold tracking-tight">
            メールを送信しました
          </h3>
          <p className="text-secondary text-sm leading-relaxed">
            入力されたメールアドレスにパスワードリセットのリンクを送信しました。メールを確認し、リンクをクリックして新しいパスワードを設定してください。
          </p>
          <Link
            href="/company/login"
            className="text-xs font-bold text-primary-container hover:underline uppercase tracking-widest mt-4"
          >
            ログイン画面に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <header className="mb-12">
        <span className="text-[10px] font-bold text-on-tertiary-fixed-variant uppercase tracking-[0.2em] mb-3 block">
          Password Recovery
        </span>
        <h3 className="text-on-surface text-3xl font-extrabold tracking-tight mb-2">
          パスワードをリセット
        </h3>
        <p className="text-secondary text-sm">
          登録済みのメールアドレスを入力してください。パスワードリセットのリンクをお送りします。
        </p>
      </header>
      <form className="space-y-6" action={formAction}>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="email">メールアドレス</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            icon="mail"
            placeholder="name@company.com"
            autoComplete="email"
            required
          />
        </div>
        {state.error && (
          <p className="text-xs font-semibold text-error px-1" role="alert">
            {state.error}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="w-full mt-4"
          disabled={isPending}
        >
          <span>{isPending ? "送信中..." : "リセットリンクを送信"}</span>
          {!isPending && <Icon name="send" className="text-lg" />}
        </Button>
      </form>
      <div className="mt-8">
        <Link
          href="/company/login"
          className="text-xs font-bold text-secondary hover:text-primary inline-flex items-center gap-1"
        >
          <Icon name="arrow_back" className="text-sm" />
          ログイン画面に戻る
        </Link>
      </div>
    </div>
  );
}
