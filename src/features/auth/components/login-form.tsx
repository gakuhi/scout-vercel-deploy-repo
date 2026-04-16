"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import {
  loginAction,
  type LoginActionState,
} from "@/features/auth/actions/login";

const initialState: LoginActionState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <div className="w-full max-w-md">
      <header className="mb-12">
        <span className="text-[10px] font-bold text-on-tertiary-fixed-variant uppercase tracking-[0.2em] mb-3 block">
          Portal Access
        </span>
        <h3 className="text-on-surface text-3xl font-extrabold tracking-tight mb-2">
          サインイン
        </h3>
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
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
            <FieldLabel htmlFor="password" className="ml-0">
              パスワード
            </FieldLabel>
            <Link
              href="/company/forgot-password"
              className="text-[10px] font-bold text-primary-container uppercase tracking-wider hover:underline"
            >
              パスワードを忘れた場合
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            icon="lock"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>
        <div className="flex items-center gap-3 px-1">
          <input
            id="remember"
            name="remember"
            type="checkbox"
            className="w-4 h-4 rounded-sm text-primary-container focus:ring-primary-container cursor-pointer"
          />
          <label
            htmlFor="remember"
            className="text-xs font-medium text-secondary cursor-pointer select-none"
          >
            ログイン状態を保持する
          </label>
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
          <span>{isPending ? "認証中..." : "ポータルにログイン"}</span>
          {!isPending && <Icon name="arrow_forward" className="text-lg" />}
        </Button>
      </form>
      <div className="mt-12 pt-8 border-t border-surface-container">
        <div className="flex items-center justify-between">
          <p className="text-xs text-secondary">
            アカウントをお持ちでないですか？
          </p>
          <Link
            href="/register"
            className="text-xs font-bold text-primary-container hover:text-primary transition-colors"
          >
            新規登録リクエスト
          </Link>
        </div>
      </div>
      <footer className="mt-12 flex justify-between items-center">
        <span className="text-[9px] font-bold text-outline-variant uppercase tracking-widest">
          © 2026 Executive Monograph
        </span>
        <div className="flex gap-4">
          <Link
            href="/privacy"
            className="text-[9px] font-bold text-outline-variant uppercase tracking-widest hover:text-primary"
          >
            プライバシー
          </Link>
          <Link
            href="/terms"
            className="text-[9px] font-bold text-outline-variant uppercase tracking-widest hover:text-primary"
          >
            利用規約
          </Link>
        </div>
      </footer>
    </div>
  );
}
