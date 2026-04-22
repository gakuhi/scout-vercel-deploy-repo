"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { deleteMemberAction } from "@/features/company/app/members/actions/delete";

type DeleteMemberButtonProps = {
  memberId: string;
  memberName: string;
};

export function DeleteMemberButton({
  memberId,
  memberName,
}: DeleteMemberButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    const ok = window.confirm(
      `「${memberName}」を無効化しますか？このメンバーはログインできなくなります。`,
    );
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteMemberAction(memberId);
      if (result.error) {
        window.alert(`無効化に失敗しました: ${result.error}`);
        return;
      }
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-xs font-bold text-secondary hover:text-error transition-colors disabled:opacity-40 flex items-center gap-1"
    >
      <Icon name="block" className="text-sm" />
      {isPending ? "無効化中..." : "無効化"}
    </button>
  );
}
