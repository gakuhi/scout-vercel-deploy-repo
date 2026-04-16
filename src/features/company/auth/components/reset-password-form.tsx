"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import {
  resetPasswordAction,
  type ResetPasswordState,
} from "@/features/company/auth/actions/reset-password";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    initialState,
  );

  return (
    <div className="w-full max-w-md">
      <header className="mb-12">
        <span className="text-[10px] font-bold text-on-tertiary-fixed-variant uppercase tracking-[0.2em] mb-3 block">
          Set New Password
        </span>
        <h3 className="text-on-surface text-3xl font-extrabold tracking-tight mb-2">
          新しいパスワードを設定
        </h3>
        <p className="text-secondary text-sm">
          8文字以上の新しいパスワードを入力してください。
        </p>
      </header>
      <form className="space-y-6" action={formAction}>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="password">新しいパスワード</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            icon="lock"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="confirmPassword">
            パスワード確認
          </FieldLabel>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            icon="lock"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            minLength={8}
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
          <span>{isPending ? "更新中..." : "パスワードを更新"}</span>
          {!isPending && <Icon name="check" className="text-lg" />}
        </Button>
      </form>
    </div>
  );
}
