import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatView } from "@/features/company/app/messages/components/chat-detail-view";
import {
  getCompanyMembership,
  listChatThreads,
} from "@/features/company/app/messages/queries";

export const metadata = {
  title: "メッセージ | ScoutLink",
};

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/company/login");

  const membership = await getCompanyMembership(user.id);
  if (!membership) redirect("/company/login");

  const threads = await listChatThreads(membership.companyId);

  return (
    <ChatView
      threads={threads}
      initialChat={null}
    />
  );
}
