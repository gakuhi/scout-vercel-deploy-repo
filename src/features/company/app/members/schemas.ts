import { z } from "zod";

export const COMPANY_MEMBER_ROLES = ["owner", "admin", "member"] as const;
export type CompanyMemberRole = (typeof COMPANY_MEMBER_ROLES)[number];

export const inviteMemberSchema = z.object({
  lastName: z.string().trim().min(1, "姓を入力してください").max(80),
  firstName: z.string().trim().min(1, "名を入力してください").max(80),
  email: z.string().email("有効なメールアドレスを入力してください"),
  role: z.enum(["admin", "member"], "ロールを選択してください"),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
