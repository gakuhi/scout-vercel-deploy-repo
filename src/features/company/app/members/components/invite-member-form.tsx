"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import {
  inviteMemberAction,
  type InviteActionState,
} from "@/features/company/app/members/actions/invite";

const initialState: InviteActionState = {};

type InviteMemberFormProps = {
  onClose?: () => void;
};

export function InviteMemberForm({ onClose }: InviteMemberFormProps) {
  const [state, formAction, isPending] = useActionState(
    inviteMemberAction,
    initialState,
  );

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <Icon
          name="check_circle"
          className="text-4xl text-primary-container"
        />
        <p className="text-sm font-bold text-primary">
          招待メールを送信しました
        </p>
        <p className="text-xs text-secondary">
          招待されたメンバーがメール内のリンクからアカウントを作成すると、
          メンバー一覧に表示されます。
        </p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-primary-container hover:underline mt-2"
          >
            閉じる
          </button>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6 p-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="invite-lastName">姓</FieldLabel>
          <Input
            id="invite-lastName"
            name="lastName"
            type="text"
            placeholder="山田"
            required
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="invite-firstName">名</FieldLabel>
          <Input
            id="invite-firstName"
            name="firstName"
            type="text"
            placeholder="太郎"
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="invite-email">メールアドレス</FieldLabel>
        <Input
          id="invite-email"
          name="email"
          type="email"
          icon="mail"
          placeholder="member@company.com"
          required
        />
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="invite-role">ロール</FieldLabel>
        <select
          id="invite-role"
          name="role"
          required
          defaultValue="member"
          className="w-full bg-surface-container-low border-none rounded-lg text-sm px-4 py-3 focus:ring-2 focus:ring-primary-container focus:outline-none font-semibold"
        >
          <option value="admin">Admin（管理者）</option>
          <option value="member">Member（一般メンバー）</option>
        </select>
        <p className="text-[10px] text-outline mt-1">
          Admin: スカウト送信・検索・メンバー閲覧 / Member: スカウト送信・検索
        </p>
      </div>
      {state.error && (
        <p className="text-xs font-semibold text-error" role="alert">
          {state.error}
        </p>
      )}
      <Button
        type="submit"
        variant="primary"
        size="md"
        className="w-full"
        disabled={isPending}
      >
        <Icon name="send" className="text-sm" />
        <span>{isPending ? "送信中..." : "招待メールを送信"}</span>
      </Button>
    </form>
  );
}
