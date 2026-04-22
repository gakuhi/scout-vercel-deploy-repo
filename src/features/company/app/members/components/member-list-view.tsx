"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Eyebrow } from "@/components/ui/tag";
import { InviteMemberForm } from "./invite-member-form";
import { DeleteMemberButton } from "./delete-member-button";
import type { CompanyMember } from "@/features/company/app/members/queries";
import type { CompanyMemberRole } from "@/features/company/app/members/schemas";

type MemberListViewProps = {
  members: CompanyMember[];
  currentUserId: string;
  currentUserRole: CompanyMemberRole | null;
};

const ROLE_LABELS: Record<CompanyMemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

const ROLE_STYLES: Record<CompanyMemberRole, string> = {
  owner: "bg-tertiary-fixed text-on-tertiary-fixed",
  admin: "bg-secondary-container text-on-secondary-container",
  member: "bg-surface-container-high text-on-surface-variant",
};

export function MemberListView({
  members,
  currentUserId,
  currentUserRole,
}: MemberListViewProps) {
  const [showInvite, setShowInvite] = useState(false);
  const [search, setSearch] = useState("");
  const isOwner = currentUserRole === "owner";

  const filteredMembers = search.trim()
    ? members.filter(
        (m) =>
          m.fullName.toLowerCase().includes(search.toLowerCase()) ||
          m.email.toLowerCase().includes(search.toLowerCase()),
      )
    : members;

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <section className="flex flex-col md:flex-row md:items-end justify-between bg-surface-container-high p-10 rounded-xl">
        <div className="max-w-2xl">
          <Eyebrow className="mb-2">Team Personnel</Eyebrow>
          <h2 className="text-4xl font-extrabold text-primary tracking-tight mb-2">
            メンバー管理
          </h2>
          <p className="text-secondary text-sm font-medium">
            現在 {members.length} 名のメンバーが所属しています。
          </p>
        </div>
      </section>

      <div className="relative">
        <Icon
          name="search"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-outline text-sm"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="名前やメールアドレスで検索..."
          className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-container focus:outline-none shadow-sm"
        />
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="px-8 py-6 flex justify-between items-center bg-surface-container-high/50">
          <h3 className="text-sm font-bold text-primary uppercase tracking-widest">
            Member Directory
          </h3>
          {isOwner && (
            <button
              type="button"
              onClick={() => setShowInvite(!showInvite)}
              className="bg-primary-container text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2"
            >
              <Icon name="person_add" className="text-sm" />
              {showInvite ? "閉じる" : "メンバーを招待"}
            </button>
          )}
        </div>

        {showInvite && (
          <div className="border-b border-surface-container-high">
            <InviteMemberForm onClose={() => setShowInvite(false)} />
          </div>
        )}

        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-low/30">
              <th className="px-8 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">
                メンバー
              </th>
              <th className="px-8 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">
                権限
              </th>
              <th className="px-8 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">
                最終ログイン
              </th>
              {isOwner && <th className="px-8 py-4" />}
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((member) => (
              <tr
                key={member.id}
                className="hover:bg-surface-container-low/50 transition-colors"
              >
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary-container text-white grid place-items-center text-sm font-bold">
                      {member.fullName.slice(0, 1)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary">
                        {member.fullName}
                        {member.id === currentUserId && (
                          <span className="text-[10px] font-medium text-outline ml-2">
                            (あなた)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-secondary">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span
                    className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full tracking-wider ${ROLE_STYLES[member.role]}`}
                  >
                    {ROLE_LABELS[member.role]}
                  </span>
                </td>
                <td className="px-8 py-5 text-xs text-secondary font-medium">
                  {member.lastSignInAt
                    ? new Intl.DateTimeFormat("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(member.lastSignInAt))
                    : "未ログイン"}
                </td>
                {isOwner && (
                  <td className="px-8 py-5 text-right">
                    {member.id !== currentUserId && (
                      <DeleteMemberButton
                        memberId={member.id}
                        memberName={member.fullName}
                      />
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isOwner && (
        <p className="text-xs text-outline italic">
          ※ メンバーの招待は企業オーナーのみ実行できます。
        </p>
      )}
    </div>
  );
}
