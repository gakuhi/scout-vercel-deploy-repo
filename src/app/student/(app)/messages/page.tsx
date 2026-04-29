import { redirect } from "next/navigation";
import { getConversations, getMessages } from "@/features/student/chat/actions";
import { ChatView } from "@/features/student/chat/components/chat-view";
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from "@/features/student/chat/mock";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StudentMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ scout?: string; mock?: string; empty?: string }>;
}) {
  const params = await searchParams;
  const useMock = params.mock === "1";
  // ?empty=1 は UI 確認用に空状態を強制表示する（dev/prod いずれでも）
  const forceEmpty = params.empty === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!useMock && !forceEmpty && !user) {
    redirect("/student/login");
  }

  const real = useMock || forceEmpty ? null : await getConversations();

  // 明示 mock 指定、または開発環境で実データが空のときは mock にフォールバック
  // ただし ?empty=1 のときは mock fallback も抑止する
  const shouldFallback =
    !forceEmpty &&
    (useMock ||
      (process.env.NODE_ENV === "development" && (real?.length ?? 0) === 0));

  const conversations = forceEmpty
    ? []
    : shouldFallback
      ? MOCK_CONVERSATIONS
      : (real ?? []);

  // 初期選択は ?scout=<id> の deep-link 指定があるときのみ。
  // モバイルで開いた直後は会話一覧を見せたいので自動選択はしない
  // （desktop でも選択前は placeholder を表示する scout 画面と揃える）。
  const requestedScoutId = params.scout ?? null;
  const matched = requestedScoutId
    ? conversations.find((c) => c.id === requestedScoutId)
    : null;
  const initialSelectedId = matched?.id ?? null;

  // メッセージの初期ロード。mock は全会話分を一括で渡し、実データは
  // 選択されている会話だけ先読みして flicker を抑える（残りは client 側で遅延取得）。
  const initialMessages: Record<string, typeof MOCK_MESSAGES[string]> = {};
  if (shouldFallback) {
    for (const c of conversations) {
      initialMessages[c.id] = MOCK_MESSAGES[c.id] ?? [];
    }
  } else if (initialSelectedId) {
    initialMessages[initialSelectedId] = await getMessages(initialSelectedId);
  }

  return (
    <ChatView
      conversations={conversations}
      initialMessages={initialMessages}
      initialSelectedId={initialSelectedId}
      isMock={shouldFallback}
    />
  );
}
