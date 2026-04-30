import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatView } from "@/features/company/app/messages/components/chat-detail-view";
import {
  getCompanyMembership,
  listChatThreads,
  getChatDetail,
} from "@/features/company/app/messages/queries";

export const metadata = {
  title: "チャット | ScoutLink",
};

export default async function ChatPage({
  params,
}: {
  params: Promise<{ scoutId: string }>;
}) {
  const { scoutId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/company/login");

  const membership = await getCompanyMembership(user.id);
  if (!membership) redirect("/company/login");

  const [threads, chat] = await Promise.all([
    listChatThreads(membership.companyId),
    getChatDetail(scoutId, membership.companyId),
  ]);

  if (!chat) notFound();

  return (
    <ChatView
      threads={threads}
      initialChat={chat}
    />
  );
}
