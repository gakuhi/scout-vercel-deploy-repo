"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAttachmentSignedUrls,
  getMessages,
  markMessagesAsRead,
  sendMessage,
} from "@/features/student/chat/actions";
import { Icon } from "@/components/ui/icon";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/shared/utils/cn";
import {
  detectAttachmentKind,
  formatBytes,
  formatDateLabel,
  formatDateMd,
  formatDateTimeJst,
  formatLastMessagePreview,
  formatRelative,
  formatTime,
  isSameDay,
  isWithinDay,
  normalizeSenderId,
  resolveAttachmentUrl,
} from "../lib/format";
import type {
  ChatAttachment,
  ChatConversation,
  ChatMessageRow,
} from "../schema";

type Props = {
  conversations: ChatConversation[];
  initialMessages: Record<string, ChatMessageRow[]>;
  initialSelectedId: string | null;
  /** true の場合は DB/Realtime を呼ばず完全にローカル動作する。 */
  isMock?: boolean;
};

export function ChatView({
  conversations: initialConversations,
  initialMessages,
  initialSelectedId,
  isMock = false,
}: Props) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId,
  );
  const [messagesMap, setMessagesMap] = useState(initialMessages);
  // 会話ごとに下書きを保持する。会話切替で入力中のテキストが消えないように
  // Record<scoutId, string> で管理。
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // 会話を開いた時点で「最初の未読メッセージ id」を 1 度だけ記録する。
  // markAsRead 後も値を保持して「↓ 新着メッセージ」マーカーを出し続けるため
  // の snapshot。値 null は「未読なし」を意味する。
  const [unreadAnchors, setUnreadAnchors] = useState<
    Record<string, string | null>
  >({});
  const [sendError, setSendError] = useState<string | null>(null);
  // 添付閲覧用の署名付き URL。path → url。mock の object URL はそのまま表示
  // するために map 対象外（path が http:/blob: 始まりのものは通さない）。
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>(
    {},
  );
  const draft = selectedId ? (drafts[selectedId] ?? "") : "";
  const updateDraft = (id: string, next: string) => {
    setDrafts((prev) => ({ ...prev, [id]: next }));
  };

  // Realtime ハンドラから最新の selectedId を参照できるよう ref に保持
  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const messages = selectedId ? (messagesMap[selectedId] ?? []) : [];

  // メッセージを会話 state に追加する（id 重複はスキップ）。
  // Realtime と楽観送信で同じ行が2回届くケースを吸収する。
  const appendMessage = useCallback(
    (scoutId: string, row: ChatMessageRow) => {
      setMessagesMap((prev) => {
        const existing = prev[scoutId] ?? [];
        if (existing.some((m) => m.id === row.id)) return prev;
        return { ...prev, [scoutId]: [...existing, row] };
      });
    },
    [],
  );

  // 会話を開いたタイミングで未読アンカーを snapshot（markAsRead で消える前に捕まえる）
  useEffect(() => {
    if (!selectedId) return;
    if (selectedId in unreadAnchors) return;
    const msgs = messagesMap[selectedId];
    if (!msgs) return;
    const firstUnread = msgs.find(
      (m) => m.senderId !== "me" && m.readAt === null,
    );
    setUnreadAnchors((prev) => ({
      ...prev,
      [selectedId]: firstUnread?.id ?? null,
    }));
  }, [selectedId, messagesMap, unreadAnchors]);

  // 会話を離れたタイミングでアンカーを null（= 閲覧済み）にする。
  // セッション中に再度同じ会話を開いても「↓ 新着メッセージ」を再表示しない
  // ため。key は残すので最初の useEffect の `selectedId in unreadAnchors`
  // ガードが効き、再計算もされない。
  useEffect(() => {
    if (!selectedId) return;
    return () => {
      setUnreadAnchors((prev) =>
        selectedId in prev ? { ...prev, [selectedId]: null } : prev,
      );
    };
  }, [selectedId]);

  // 添付メッセージが増えたら、未取得の path について署名付き URL を取る。
  // mock や楽観送信で object URL が入った path は既に表示可能なのでスキップ。
  useEffect(() => {
    if (isMock) return;
    const needed: string[] = [];
    for (const msgs of Object.values(messagesMap)) {
      for (const m of msgs) {
        for (const a of m.attachments) {
          if (!a.path) continue;
          if (/^(blob|https?):/.test(a.path)) continue;
          if (attachmentUrls[a.path]) continue;
          if (!needed.includes(a.path)) needed.push(a.path);
        }
      }
    }
    if (needed.length === 0) return;
    let cancelled = false;
    (async () => {
      const map = await getAttachmentSignedUrls(needed);
      if (cancelled) return;
      setAttachmentUrls((prev) => ({ ...prev, ...map }));
    })();
    return () => {
      cancelled = true;
    };
  }, [messagesMap, isMock, attachmentUrls]);

  // 会話切替: 未ロードならメッセージを取得し、相手からの未読を既読化する
  useEffect(() => {
    if (!selectedId || isMock) return;
    let active = true;
    (async () => {
      if (!messagesMap[selectedId]) {
        const rows = await getMessages(selectedId);
        if (!active) return;
        setMessagesMap((prev) => ({ ...prev, [selectedId]: rows }));
      }
      await markMessagesAsRead(selectedId);
      if (!active) return;
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c)),
      );
    })();
    return () => {
      active = false;
    };
    // messagesMap を依存に入れると選択毎にループしうるので意図的に外す
  }, [selectedId, isMock]);

  // Realtime: Issue #112 要件に従い scout_id 側でサーバーフィルタを掛けた上で
  // chat_messages の INSERT を購読する。会話が無いときは購読しない。
  // 会話一覧（accepted スカウト）の集合は SSR 時点で固定なので、conversations
  // の参照変化ではなく mount/unmount 単位で購読する設計にする。
  const scoutIdsKey = useMemo(
    () => initialConversations.map((c) => c.id).sort().join(","),
    [initialConversations],
  );
  useEffect(() => {
    if (isMock) return;
    if (!scoutIdsKey) return;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    // Cookie からのセッション復元は非同期。subscribe より先に JWT が
    // realtime に伝わっていないと anon 扱いで postgres_changes フィルタの
    // 事前検証に落ちて以降 rejoin されない。getSession() で復元を待つ。
    void supabase.auth.getSession().then(() => {
      if (cancelled) return;
      channel = supabase
      .channel("student-chat-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `scout_id=in.(${scoutIdsKey})`,
        },
        (payload) => {
          const m = payload.new as {
            id: string;
            scout_id: string;
            sender_id: string;
            sender_role: "student" | "company_member";
            content: string;
            read_at: string | null;
            created_at: string;
            attachments: ChatAttachment[] | null;
          };
          const row: ChatMessageRow = {
            id: m.id,
            conversationId: m.scout_id,
            senderId: normalizeSenderId(m.sender_role),
            body: m.content,
            createdAt: m.created_at,
            readAt: m.read_at,
            attachments: Array.isArray(m.attachments) ? m.attachments : [],
          };
          appendMessage(m.scout_id, row);
          setConversations((prev) =>
            prev.map((c) =>
              c.id === m.scout_id
                ? {
                    ...c,
                    lastMessage: {
                      body: formatLastMessagePreview(row),
                      at: m.created_at,
                    },
                    unreadCount:
                      m.sender_role !== "student" &&
                      m.scout_id !== selectedIdRef.current
                        ? c.unreadCount + 1
                        : c.unreadCount,
                  }
                : c,
            ),
          );
          // 自分が開いている会話に企業からの新着が来た場合は即時既読化
          if (
            m.sender_role !== "student" &&
            m.scout_id === selectedIdRef.current
          ) {
            void markMessagesAsRead(m.scout_id);
          }
        },
      )
      .subscribe();
    });
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [isMock, scoutIdsKey, appendMessage]);

  const handleSend = async (drafts: DraftAttachment[]) => {
    const body = draft.trim();
    if (!selectedId) return;
    if (!body && drafts.length === 0) return;
    const sendingId = selectedId;
    setSendError(null);
    updateDraft(sendingId, "");

    if (isMock) {
      // mock モードは Storage にアップせず object URL を path に詰めて表示する。
      appendMessage(sendingId, {
        id: `tmp-${Date.now()}`,
        conversationId: sendingId,
        senderId: "me",
        body,
        createdAt: new Date().toISOString(),
        readAt: null,
        attachments: drafts
          .filter((d) => d.file)
          .map((d) => ({
            id: d.id,
            kind: detectAttachmentKind(d.file!),
            name: d.file!.name,
            path: URL.createObjectURL(d.file!),
            mimeType: d.file!.type || null,
            sizeBytes: d.file!.size,
          })),
      });
      return;
    }

    // 1. 添付ファイルを順次 Storage にアップロード（失敗時は掃除）
    const supabase = createClient();
    const uploaded: ChatAttachment[] = [];
    for (const d of drafts) {
      if (!d.file) continue;
      const file = d.file;
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
      const path = `${sendingId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type || undefined,
          upsert: false,
        });
      if (uploadError) {
        if (uploaded.length > 0) {
          await supabase.storage
            .from("chat-attachments")
            .remove(uploaded.map((u) => u.path));
        }
        setSendError("添付のアップロードに失敗しました");
        updateDraft(sendingId, body);
        return;
      }
      uploaded.push({
        id: d.id,
        kind: detectAttachmentKind(file),
        name: file.name,
        path,
        mimeType: file.type || null,
        sizeBytes: file.size,
      });
      // 送信直後は signed URL 取得前に object URL を差し込み、
      // 自分が送った画像/動画/ファイルが即時表示されるようにする。
      // 次回以降の fetch で signed URL へ置き換わる。
      const localUrl = URL.createObjectURL(file);
      setAttachmentUrls((prev) => ({ ...prev, [path]: localUrl }));
    }

    // 2. メッセージ行を挿入（失敗時はサーバー側で uploaded を掃除する）
    const result = await sendMessage(sendingId, body, uploaded);
    if (!result.ok) {
      setSendError(result.error);
      updateDraft(sendingId, body);
      return;
    }
    // Realtime が同じ行を届ける可能性があるが appendMessage で重複排除される
    appendMessage(sendingId, result.message);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === sendingId
          ? {
              ...c,
              lastMessage: {
                body: formatLastMessagePreview(result.message),
                at: result.message.createdAt,
              },
            }
          : c,
      ),
    );
  };

  if (conversations.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="relative -mx-6 md:-mx-10 -mt-10 md:-mt-10 md:-mb-16 h-[calc(100vh-8rem)] md:h-[calc(100vh-2.5rem)] overflow-hidden">
      <HeroBackground />
      <div className="relative h-full flex gap-3 md:gap-4 p-3 md:p-4">
        <ConversationList
          conversations={conversations}
          messagesMap={messagesMap}
          selectedId={selectedId}
          onSelect={setSelectedId}
          hiddenOnMobile={!!selected}
        />
        <section
          className={cn(
            "flex-1 glass-panel rounded-xl overflow-hidden shadow-sm flex flex-col min-w-0",
            selected ? "flex" : "hidden lg:flex",
          )}
        >
          {selected ? (
            <>
              <ChatHeader
                conversation={selected}
                onBack={() => setSelectedId(null)}
              />
              <MessageStream
                key={selected.id}
                messages={messages}
                company={selected.company}
                unreadAnchorId={unreadAnchors[selected.id] ?? null}
                attachmentUrls={attachmentUrls}
              />
              {sendError && (
                <div className="px-4 md:px-6 pb-2">
                  <div className="flex items-center gap-2 bg-error-container text-on-error-container text-xs font-semibold px-3 py-2 rounded-lg">
                    <Icon name="error" className="text-sm" />
                    <span className="flex-1">{sendError}</span>
                    <button
                      type="button"
                      onClick={() => setSendError(null)}
                      aria-label="閉じる"
                      className="text-on-error-container/70 hover:text-on-error-container"
                    >
                      <Icon name="close" className="text-sm" />
                    </button>
                  </div>
                </div>
              )}
              <MessageInput
                value={draft}
                onChange={(v) => {
                  updateDraft(selected.id, v);
                  if (sendError) setSendError(null);
                }}
                onSend={handleSend}
              />
            </>
          ) : (
            <DetailPlaceholder />
          )}
        </section>
        {selected && <DetailColumn conversation={selected} />}
      </div>
    </div>
  );
}

// デザイン参考の Google Stitch 提供画像。demo 用途のため、
// 本番化時は Supabase Storage か bundled asset に差し替える想定。
const HERO_IMAGE_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAt0pTGP-qAJZh7Gaebjz4uUrKu72BUkAd2vefIXx89lR9Z_XqlI-8ATdAfwUbeuAq2Zp_V54YhhqLBRyxawttRtf78BjRzu9fI_BXzb41Fw2DBh1XinuepCpA5yYctKPl1izDmJ3lUaDxHdl-bNOUjp8Gu4aEEUL_LeKr8MxDBy7uzCrbZVZylrHnMekdqicr-tFv_qn5XfeHGbfaW3ESIRQbVgBqyNr6lGlECEDGFI_ZUyGxi6shk7SzUU8wkVFvrt3sRyXO7Tlg";

function HeroBackground() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 bg-cover bg-center opacity-20 grayscale pointer-events-none"
      style={{ backgroundImage: `url(${HERO_IMAGE_URL})` }}
    />
  );
}

function ConversationList({
  conversations,
  selectedId,
  onSelect,
  hiddenOnMobile,
  messagesMap,
}: {
  conversations: ChatConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  hiddenOnMobile: boolean;
  /** ロード済みメッセージ。検索は読み込まれている本文すべてを対象にする。 */
  messagesMap: Record<string, ChatMessageRow[]>;
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  // 検索中はマッチしたメッセージごとに 1 件ずつ結果を出す。新しい順に並べる。
  // 未ロード会話は本文を辿れないので lastMessage 本文のヒットだけ拾う。
  const hits = normalized
    ? conversations
        .flatMap<SearchHit>((c) => {
          const msgs = messagesMap[c.id];
          if (msgs && msgs.length > 0) {
            return msgs
              .filter((m) => m.body.toLowerCase().includes(normalized))
              .map((m) => ({ conversation: c, message: m }));
          }
          if (c.lastMessage.body.toLowerCase().includes(normalized)) {
            return [
              {
                conversation: c,
                message: {
                  id: `last-${c.id}`,
                  conversationId: c.id,
                  senderId: "preview",
                  body: c.lastMessage.body,
                  createdAt: c.lastMessage.at,
                  readAt: null,
                  attachments: [],
                },
              },
            ];
          }
          return [];
        })
        .sort(
          (a, b) =>
            new Date(b.message.createdAt).getTime() -
            new Date(a.message.createdAt).getTime(),
        )
    : [];
  return (
    <aside
      className={cn(
        "w-full lg:w-56 xl:w-60 glass-panel rounded-xl overflow-hidden shadow-sm flex-col",
        hiddenOnMobile ? "hidden lg:flex" : "flex",
      )}
    >
      <div className="px-5 py-5 border-b border-outline-variant/30 space-y-3">
        <h2 className="text-base font-bold tracking-tight text-primary">
          メッセージ
        </h2>
        <div className="relative">
          <Icon
            name="search"
            className="text-sm text-outline absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="会社名・本文で検索"
            className="w-full bg-surface-container-low border-0 rounded-lg pl-8 pr-8 py-1.5 text-xs font-semibold text-on-surface placeholder:text-outline/70 focus:ring-1 focus:ring-primary-container outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="検索をクリア"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-primary p-0.5"
            >
              <Icon name="close" className="text-sm" />
            </button>
          )}
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto">
        {normalized ? (
          hits.length === 0 ? (
            <li className="px-5 py-6 text-xs text-outline text-center">
              該当するメッセージがありません
            </li>
          ) : (
            hits.map((hit) => (
              <li key={`${hit.conversation.id}:${hit.message.id}`}>
                <SearchResultItem
                  hit={hit}
                  query={normalized}
                  active={hit.conversation.id === selectedId}
                  onClick={() => onSelect(hit.conversation.id)}
                />
              </li>
            ))
          )
        ) : conversations.length === 0 ? (
          <li className="px-5 py-6 text-xs text-outline text-center">
            会話がありません
          </li>
        ) : (
          conversations.map((c) => (
            <li key={c.id}>
              <ConversationItem
                conversation={c}
                active={c.id === selectedId}
                onClick={() => onSelect(c.id)}
              />
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}

type SearchHit = {
  conversation: ChatConversation;
  message: ChatMessageRow;
};

function SearchResultItem({
  hit,
  query,
  active,
  onClick,
}: {
  hit: SearchHit;
  query: string;
  active: boolean;
  onClick: () => void;
}) {
  const { conversation, message } = hit;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 border-l-4 transition-colors",
        active
          ? "bg-surface-container-low border-primary"
          : "border-transparent hover:bg-surface-container",
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar
          name={conversation.company.name}
          initials={conversation.company.initials}
          size={12}
          rounded="lg"
        />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline gap-2">
            <h3 className="text-sm font-semibold truncate">
              {conversation.company.name}
            </h3>
            <span className="text-[10px] text-outline shrink-0">
              {formatRelative(message.createdAt)}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant line-clamp-2 mt-0.5 break-all">
            <HighlightedText text={message.body} query={query} />
          </p>
        </div>
      </div>
    </button>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: Array<{ text: string; match: boolean }> = [];
  let cursor = 0;
  while (cursor < text.length) {
    const idx = lower.indexOf(query, cursor);
    if (idx === -1) {
      parts.push({ text: text.slice(cursor), match: false });
      break;
    }
    if (idx > cursor) parts.push({ text: text.slice(cursor, idx), match: false });
    parts.push({ text: text.slice(idx, idx + query.length), match: true });
    cursor = idx + query.length;
  }
  return (
    <>
      {parts.map((p, i) =>
        p.match ? (
          <mark
            key={i}
            className="bg-primary-container/30 text-on-surface rounded px-0.5"
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

function ConversationItem({
  conversation,
  active,
  onClick,
}: {
  conversation: ChatConversation;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 border-l-4 transition-colors",
        active
          ? "bg-surface-container-low border-primary"
          : "border-transparent hover:bg-surface-container",
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar
          name={conversation.company.name}
          initials={conversation.company.initials}
          size={12}
          rounded="lg"
        />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline gap-2">
            <h3
              className={cn(
                "text-sm truncate",
                conversation.unreadCount > 0 ? "font-bold" : "font-semibold",
              )}
            >
              {conversation.company.name}
            </h3>
            <span className="text-[10px] text-outline shrink-0">
              {formatRelative(conversation.lastMessage.at)}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant truncate mt-0.5">
            {conversation.lastMessage.body}
          </p>
        </div>
      </div>
    </button>
  );
}

function ChatHeader({
  conversation,
  onBack,
}: {
  conversation: ChatConversation;
  onBack: () => void;
}) {
  // NEW バッジはチャット開始（スカウト承諾）から 24 時間以内のみ表示。
  const hasNew = isWithinDay(conversation.startedAt);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scoutExpanded, setScoutExpanded] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const summary = conversation.scoutSummary;
  const sentLabel = formatDateTimeJst(summary.sentAt);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuWrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div className="border-b border-outline-variant/30">
      <div className="px-5 md:px-6 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="一覧に戻る"
            className="lg:hidden text-on-surface-variant p-1 -ml-1"
          >
            <Icon name="arrow_back" />
          </button>
          <h2 className="text-sm md:text-base font-bold text-primary truncate">
            {conversation.company.name}
          </h2>
          {hasNew && (
            <span className="bg-tertiary-fixed text-tertiary-container px-2 py-0.5 rounded text-[10px] font-bold tracking-wider shrink-0">
              NEW
            </span>
          )}
        </div>
        <div className="relative" ref={menuWrapRef}>
          <button
            type="button"
            aria-label="その他"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              "transition-colors p-1",
              menuOpen ? "text-primary" : "text-outline hover:text-primary",
            )}
          >
            <Icon name="more_vert" filled={menuOpen} />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute top-full right-0 mt-1 w-52 bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-xl py-1 z-20"
            >
              <ChatMenuItem
                icon="flag"
                label="通報する"
                onClick={() => setMenuOpen(false)}
              />
              <ChatMenuItem
                icon="bug_report"
                label="不具合を報告する"
                onClick={() => setMenuOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
      <div className="px-5 md:px-6 pb-3">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5 text-[10px] text-outline min-w-0">
            <Icon name="mail_outline" className="text-xs shrink-0" />
            <span className="font-bold uppercase tracking-wider shrink-0">
              スカウト
            </span>
            <span className="truncate">{sentLabel}</span>
          </div>
          <button
            type="button"
            onClick={() => setScoutExpanded((v) => !v)}
            className="text-[10px] font-bold text-primary-container hover:underline shrink-0"
          >
            {scoutExpanded ? "閉じる" : "全文"}
          </button>
        </div>
        <p className="text-xs font-bold text-on-surface truncate">
          {summary.subject}
          {summary.jobTitle && (
            <span className="text-[10px] font-normal text-on-surface-variant ml-2">
              / {summary.jobTitle}
            </span>
          )}
        </p>
        {scoutExpanded && (
          <p className="mt-1.5 text-[11px] text-on-surface-variant whitespace-pre-wrap leading-relaxed">
            {summary.message}
          </p>
        )}
      </div>
    </div>
  );
}

function ChatMenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-2",
        danger
          ? "text-error hover:bg-error-container/30"
          : "text-on-surface hover:bg-surface-container-low",
      )}
    >
      <Icon
        name={icon}
        className={cn("text-sm", danger ? "text-error" : "text-outline")}
      />
      {label}
    </button>
  );
}

function MessageStream({
  messages,
  company,
  unreadAnchorId,
  attachmentUrls,
}: {
  messages: ChatMessageRow[];
  company: ChatConversation["company"];
  unreadAnchorId: string | null;
  attachmentUrls: Record<string, string>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // 初回（会話を開いた直後）は末尾に瞬間移動、以降の新着は smooth で追従する。
  // smooth のまま初回を描くとモバイルで「上から下へスクロール」する様子が見えてしまう。
  // 会話切替時は ChatView 側で key を切って remount させ、このフラグがリセットされる。
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || messages.length === 0) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: hasScrolledRef.current ? "smooth" : "instant",
    });
    hasScrolledRef.current = true;
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 md:p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="grid place-items-center pt-10">
          <div className="text-center">
            <Icon
              name="mark_unread_chat_alt"
              className="text-outline text-4xl mb-2"
            />
            <p className="text-sm font-semibold text-on-surface-variant">
              まだメッセージはありません
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {messages.map((m, i) => {
        const isMe = m.senderId === "me";
        const prev = messages[i - 1];
        const showAvatar = !isMe && (!prev || prev.senderId !== m.senderId);
        const showDateDivider =
          !prev || !isSameDay(prev.createdAt, m.createdAt);
        const showUnreadMarker = m.id === unreadAnchorId;
        return (
          <div key={m.id} className="space-y-5">
            {showDateDivider && <DateDivider iso={m.createdAt} />}
            {showUnreadMarker && <UnreadMarker />}
            <MessageBubble
              message={m}
              isMe={isMe}
              showAvatar={showAvatar}
              company={company}
              attachmentUrls={attachmentUrls}
            />
          </div>
        );
      })}
    </div>
  );
}

function DateDivider({ iso }: { iso: string }) {
  return (
    <div className="flex items-center justify-center">
      <span className="bg-surface-container-low text-outline text-[10px] font-bold px-3 py-1 rounded-full">
        {formatDateLabel(iso)}
      </span>
    </div>
  );
}

function UnreadMarker() {
  return (
    <div className="flex items-center gap-2" aria-label="新着メッセージ">
      <div className="flex-1 h-px bg-primary-container/50" />
      <span className="text-[10px] font-bold text-primary-container tracking-wider uppercase shrink-0">
        ↓ 新着メッセージ
      </span>
      <div className="flex-1 h-px bg-primary-container/50" />
    </div>
  );
}

function MessageBubble({
  message,
  isMe,
  showAvatar,
  company,
  attachmentUrls,
}: {
  message: ChatMessageRow;
  isMe: boolean;
  showAvatar: boolean;
  company: ChatConversation["company"];
  attachmentUrls: Record<string, string>;
}) {
  if (isMe) {
    return (
      <div className="flex flex-row-reverse gap-3 ml-auto max-w-[85%]">
        <div className="flex flex-col items-end space-y-1">
          <div className="bg-primary-container text-white p-4 rounded-l-xl rounded-br-xl text-sm leading-relaxed">
            {message.attachments.length > 0 && (
              <AttachmentList
                attachments={message.attachments}
                urls={attachmentUrls}
                isMe
              />
            )}
            {message.body && (
              <div
                className={cn(
                  "whitespace-pre-wrap break-all",
                  message.attachments.length > 0 && "mt-2",
                )}
              >
                {message.body}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mr-1">
            {message.readAt && (
              <span className="text-[10px] text-primary font-bold">既読</span>
            )}
            <span className="text-[10px] text-outline">
              {formatTime(message.createdAt)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3 max-w-[85%]">
      <div className="w-8 h-8 shrink-0">
        {showAvatar && (
          <Avatar
            name={company.name}
            initials={company.initials}
            size={8}
            rounded="lg"
          />
        )}
      </div>
      <div className="space-y-1 min-w-0">
        <div className="bg-surface-container p-4 rounded-r-xl rounded-bl-xl text-sm leading-relaxed text-on-surface">
          {message.attachments.length > 0 && (
            <AttachmentList
              attachments={message.attachments}
              urls={attachmentUrls}
              isMe={false}
            />
          )}
          {message.body && (
            <div
              className={cn(
                "whitespace-pre-wrap break-all",
                message.attachments.length > 0 && "mt-2",
              )}
            >
              {message.body}
            </div>
          )}
        </div>
        <span className="text-[10px] text-outline ml-1 block">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

function AttachmentList({
  attachments,
  urls,
  isMe,
}: {
  attachments: ChatAttachment[];
  urls: Record<string, string>;
  isMe: boolean;
}) {
  return (
    <div className="space-y-2">
      {attachments.map((a) => (
        <AttachmentItem
          key={a.id}
          attachment={a}
          url={resolveAttachmentUrl(a.path, urls)}
          isMe={isMe}
        />
      ))}
    </div>
  );
}

function AttachmentItem({
  attachment,
  url,
  isMe,
}: {
  attachment: ChatAttachment;
  url: string | null;
  isMe: boolean;
}) {
  if (!url) {
    return (
      <div
        className={cn(
          "text-[11px] px-2 py-1 rounded-md",
          isMe ? "bg-white/10 text-white/70" : "bg-surface-container-low text-outline",
        )}
      >
        添付を読み込み中…
      </div>
    );
  }
  if (attachment.kind === "image") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={attachment.name}
          className="max-w-full max-h-80 rounded-md object-contain bg-black/5"
        />
      </a>
    );
  }
  if (attachment.kind === "video") {
    return (
      <video
        src={url}
        controls
        preload="metadata"
        className="max-w-full max-h-80 rounded-md bg-black"
      />
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.name}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 border text-xs font-semibold",
        isMe
          ? "border-white/30 text-white hover:bg-white/10"
          : "border-outline-variant/50 text-on-surface hover:bg-surface-container-low",
      )}
    >
      <Icon name="attach_file" className="text-sm" />
      <span className="flex-1 truncate">{attachment.name}</span>
      {attachment.sizeBytes != null && (
        <span className="text-[10px] opacity-70 shrink-0">
          {formatBytes(attachment.sizeBytes)}
        </span>
      )}
    </a>
  );
}

type AttachmentKind = "photo" | "file" | "location" | "schedule";

type DraftAttachment = {
  id: string;
  kind: AttachmentKind;
  name: string;
  /** 実ファイル。photo/file では必須。location は未指定。 */
  file?: File;
};

const ATTACHMENT_MENU: ReadonlyArray<{
  kind: AttachmentKind;
  label: string;
  icon: string;
  bgClass: string;
}> = [
  {
    kind: "photo",
    label: "写真・動画",
    icon: "photo_library",
    bgClass: "bg-primary-container",
  },
  {
    kind: "file",
    label: "ファイル",
    icon: "description",
    bgClass: "bg-tertiary-container",
  },
  {
    kind: "location",
    label: "位置情報",
    icon: "location_on",
    bgClass: "bg-on-secondary-container",
  },
  {
    kind: "schedule",
    label: "面談日程を提案",
    icon: "event",
    bgClass: "bg-primary",
  },
];

function MessageInput({
  value,
  onChange,
  onSend,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: (attachments: DraftAttachment[]) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 入力に応じて textarea の高さを scrollHeight に合わせる。max-h で 5 行に頭打ち、
  // それ以上は内部スクロール。height: auto で一度リセットしないと縮小できない。
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // メニュー外クリック / Escape で閉じる
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuWrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleMenuClick = (kind: AttachmentKind) => {
    setMenuOpen(false);
    if (kind === "photo") photoInputRef.current?.click();
    else if (kind === "file") fileInputRef.current?.click();
    else if (kind === "location") {
      setLocationOpen(true);
    } else if (kind === "schedule") {
      setScheduleOpen(true);
    }
  };

  const handleFiles = (kind: AttachmentKind, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const additions: DraftAttachment[] = Array.from(files).map((f, i) => ({
      id: `a-${Date.now()}-${i}`,
      kind,
      name: f.name,
      file: f,
    }));
    setAttachments((prev) => [...prev, ...additions]);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSend = () => {
    if (!value.trim() && attachments.length === 0) return;
    onSend(attachments);
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey || e.shiftKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = value.trim().length > 0 || attachments.length > 0;

  return (
    <div className="p-4 md:p-6 pt-0">
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm focus-within:border-primary-container transition-colors">
        {attachments.length > 0 && (
          <ul className="flex flex-wrap gap-2 p-3 pb-0">
            {attachments.map((a) => (
              <AttachmentChip
                key={a.id}
                attachment={a}
                onRemove={() => handleRemoveAttachment(a.id)}
              />
            ))}
          </ul>
        )}
        <div className="flex items-center gap-2 p-2">
          <div className="relative shrink-0" ref={menuWrapRef}>
            <button
              type="button"
              aria-label="添付"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                "p-2 transition-colors",
                menuOpen
                  ? "text-primary"
                  : "text-outline hover:text-primary",
              )}
            >
              <Icon name="add_circle" filled={menuOpen} />
            </button>
            {menuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-44 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-xl p-3 grid grid-cols-2 gap-1 z-20">
                {ATTACHMENT_MENU.map((m) => (
                  <button
                    key={m.kind}
                    type="button"
                    onClick={() => handleMenuClick(m.kind)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-surface-container-low transition-colors"
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full grid place-items-center text-white",
                        m.bgClass,
                      )}
                    >
                      <Icon name={m.icon} className="text-lg" />
                    </div>
                    <span className="text-[10px] font-semibold text-on-surface-variant text-center leading-tight">
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            rows={1}
            // text-sm の line-height は 20px。5 行 × 20 + py-2 (16px) = 116px ≈ 7.25rem
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 resize-none max-h-[7.25rem] overflow-y-auto outline-none min-w-0"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            aria-label="送信"
            className="shrink-0 inline-flex items-center justify-center bg-primary-container text-white p-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icon name="send" filled className="text-sm leading-none" />
          </button>
        </div>
      </div>
      {/* 非表示の file input 群。aria-hidden で支援技術には無視させる。 */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        aria-hidden
        onChange={(e) => {
          handleFiles("photo", e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        aria-hidden
        onChange={(e) => {
          handleFiles("file", e.target.files);
          e.target.value = "";
        }}
      />
      {scheduleOpen && (
        <ScheduleProposalDialog
          onCancel={() => setScheduleOpen(false)}
          onSubmit={(text) => {
            const existing = value.trim();
            onChange(existing ? `${existing}\n\n${text}` : text);
            setScheduleOpen(false);
          }}
        />
      )}
      {locationOpen && (
        <LocationPickerDialog
          onCancel={() => setLocationOpen(false)}
          onSubmit={(text) => {
            const existing = value.trim();
            onChange(existing ? `${existing}\n\n${text}` : text);
            setLocationOpen(false);
          }}
        />
      )}
    </div>
  );
}

function LocationPickerDialog({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (text: string) => void;
}) {
  const [query, setQuery] = useState("");
  // iframe を毎キーストロークで再ロードしないよう、確定したクエリだけプレビューに反映する。
  const [committed, setCommitted] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setCommitted(query.trim()), 400);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const handleSubmit = () => {
    const q = query.trim();
    if (!q) return;
    // 共有用 URL は Google Maps ユニバーサルリンク（モバイル/PC どちらでも開ける）。
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    onSubmit(`📍 ${q}\n${url}`);
  };

  // 埋め込みプレビューは API キー不要の `output=embed` レガシーエンドポイント。
  const embedSrc = committed
    ? `https://www.google.com/maps?q=${encodeURIComponent(committed)}&z=15&output=embed`
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-picker-title"
      className="fixed inset-0 z-60 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="閉じる"
        onClick={onCancel}
        className="absolute inset-0 bg-black/50"
      />
      <div className="relative bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="mb-4">
          <h4
            id="location-picker-title"
            className="text-base font-bold text-on-surface mb-1"
          >
            位置情報を共有
          </h4>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            場所名や住所を入力すると、Google Maps のプレビューが表示されます。
          </p>
        </div>
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="例: 東京駅、渋谷スクランブル交差点"
          className="w-full bg-surface-container-low border-0 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-outline/70 focus:ring-1 focus:ring-primary-container outline-none mb-3"
        />
        <div className="aspect-video bg-surface-container-low rounded-lg overflow-hidden mb-4">
          {embedSrc ? (
            <iframe
              key={embedSrc}
              src={embedSrc}
              title="Google Maps プレビュー"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full border-0"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-xs text-outline px-4 text-center">
              場所名を入力するとここに地図が表示されます
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container rounded-lg"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!query.trim()}
            className="px-4 py-2 text-xs font-bold bg-primary-container text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            この場所を送信
          </button>
        </div>
      </div>
    </div>
  );
}

// 時 / 分は独立した state で持つ（片方だけ選んだ途中状態も保持するため）。
// formatSlotLabel / canSubmit では両方そろった時だけ HH:MM として扱う。
type ScheduleSlot = { date: string; hour: string; minute: string };

// 面談候補の時刻は「時」と「分」を別セレクトで選ばせる。分だけ 15 分刻み。
const SCHEDULE_HOUR_OPTIONS: string[] = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const SCHEDULE_MINUTE_OPTIONS: string[] = ["00", "15", "30", "45"];

function ScheduleProposalDialog({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (text: string) => void;
}) {
  const [slots, setSlots] = useState<ScheduleSlot[]>([
    { date: "", hour: "", minute: "" },
    { date: "", hour: "", minute: "" },
    { date: "", hour: "", minute: "" },
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const updateSlot = (i: number, patch: Partial<ScheduleSlot>) => {
    setSlots((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    );
  };

  const filled = slots.filter((s) => s.date && s.hour && s.minute);
  const canSubmit = filled.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const lines = filled.map((s) => `・${formatSlotLabel(s)}`).join("\n");
    const text = `🗓 面談候補日のご提案\n${lines}\n\nご都合のよい日時をお知らせください。`;
    onSubmit(text);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-proposal-title"
      className="fixed inset-0 z-60 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="閉じる"
        onClick={onCancel}
        className="absolute inset-0 bg-black/50"
      />
      <div className="relative bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="mb-4">
          <h4
            id="schedule-proposal-title"
            className="text-base font-bold text-on-surface mb-1"
          >
            面談日程を提案
          </h4>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            候補日時を 1〜3 件選んでください。入力した内容がメッセージに挿入されます。
          </p>
        </div>
        <div className="space-y-2 mb-4">
          {slots.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-outline w-6 shrink-0">
                #{i + 1}
              </span>
              <ScheduleDateField
                value={s.date}
                onChange={(next) => updateSlot(i, { date: next })}
                ariaLabel={`#${i + 1} 日付`}
              />
              <CompactScrollSelect
                ariaLabel={`#${i + 1} 時`}
                value={s.hour}
                onChange={(next) => updateSlot(i, { hour: next })}
                options={SCHEDULE_HOUR_OPTIONS}
              />
              <span className="text-xs text-outline shrink-0">:</span>
              <CompactScrollSelect
                ariaLabel={`#${i + 1} 分`}
                value={s.minute}
                onChange={(next) => updateSlot(i, { minute: next })}
                options={SCHEDULE_MINUTE_OPTIONS}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 bg-surface-container-low text-on-surface-variant text-xs font-bold rounded-lg hover:bg-surface-container-high transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-primary-container text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            <Icon name="event" className="text-sm" />
            メッセージに挿入
          </button>
        </div>
      </div>
    </div>
  );
}

function CompactScrollSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  options: readonly string[];
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-16 bg-surface-container-low border-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-on-surface focus:ring-1 focus:ring-primary-container outline-none text-left"
      >
        {value || "--"}
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full mt-1 z-30 w-16 max-h-32 overflow-y-auto bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-xl py-1"
        >
          <li>
            <button
              type="button"
              onClick={() => choose("")}
              className={cn(
                "w-full px-3 py-1 text-xs text-left hover:bg-surface-container-low",
                value === "" && "bg-primary-container/10 font-bold",
              )}
            >
              --
            </button>
          </li>
          {options.map((o) => (
            <li key={o}>
              <button
                type="button"
                role="option"
                aria-selected={o === value}
                onClick={() => choose(o)}
                className={cn(
                  "w-full px-3 py-1 text-xs text-left hover:bg-surface-container-low",
                  o === value && "bg-primary-container/10 font-bold",
                )}
              >
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScheduleDateField({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    // showPicker() は近年の Chrome / Firefox / Safari でサポート済み。
    // 未対応環境では focus で native UI を呼び出し、最悪でも click で open できる。
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch {
        // showPicker は user activation を必要とするが、ここは click ハンドラ配下なので
        // 通常は throw しない。万一失敗したら focus にフォールバック。
      }
    }
    el.focus();
    el.click();
  };
  return (
    <div className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={openPicker}
        aria-label={ariaLabel}
        className="w-full text-left bg-surface-container-low rounded-lg px-2 py-1.5 text-xs font-semibold text-on-surface focus:ring-1 focus:ring-primary-container outline-none"
      >
        {value ? (
          formatDateMd(value)
        ) : (
          <span className="text-outline">月/日</span>
        )}
      </button>
      {/* native カレンダーのアンカー。視覚上は button を表示するが、UI 的には
          同じ矩形に重なっているので showPicker 非対応時も自然に動く。 */}
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden
        className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
      />
    </div>
  );
}

function formatSlotLabel(slot: ScheduleSlot): string {
  const time = `${slot.hour}:${slot.minute}`;
  const d = new Date(`${slot.date}T${time}`);
  if (Number.isNaN(d.getTime())) return `${slot.date} ${time}`;
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${m}月${day}日(${weekday}) ${hh}:${mm}〜`;
}

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: DraftAttachment;
  onRemove: () => void;
}) {
  const meta = ATTACHMENT_MENU.find((m) => m.kind === attachment.kind);
  return (
    <li className="inline-flex items-center gap-2 bg-surface-container-low rounded-full pl-3 pr-1 py-1 max-w-full">
      {meta && (
        <Icon name={meta.icon} className="text-sm text-outline shrink-0" />
      )}
      <span className="text-xs text-on-surface truncate max-w-[10rem]">
        {attachment.name}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="添付を削除"
        className="p-1 rounded-full text-outline hover:text-error hover:bg-surface-container shrink-0"
      >
        <Icon name="close" className="text-xs" />
      </button>
    </li>
  );
}

function DetailColumn({ conversation }: { conversation: ChatConversation }) {
  const { event } = conversation.detail;
  return (
    <aside className="hidden xl:flex flex-col w-64 gap-4 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <CompanyProfileCard conversation={conversation} />
      {event && <EventPromoCard event={event} />}
    </aside>
  );
}

function CompanyProfileCard({
  conversation,
}: {
  conversation: ChatConversation;
}) {
  const { company, detail } = conversation;
  return (
    <div className="glass-panel rounded-xl overflow-hidden shadow-sm shrink-0">
      <div className="h-24 bg-linear-to-br from-primary-container/60 to-secondary/40" />
      <div className="p-6 -mt-10 relative">
        <div className="w-16 h-16 rounded-xl border-4 border-white shadow-md mb-4 bg-primary-container grid place-items-center text-white font-bold">
          {company.initials ?? company.name.slice(0, 2)}
        </div>
        <h3 className="text-base font-bold text-primary mb-1">{company.name}</h3>
        <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
          {detail.industry}事業を中心に展開。採用プロセスは {detail.phaseLabel}{" "}
          フェーズです。
        </p>
        <div className="space-y-2.5">
          <InfoRow icon="location_on" text="東京都千代田区大手町 1-2-3" />
          <InfoRow icon="group" text="従業員数: 450名" />
          <InfoRow
            icon="language"
            text="gt-global.tech"
            textClass="text-primary-container underline"
          />
        </div>
      </div>
      <div className="p-4 bg-surface-container-low border-t border-outline-variant/30">
        <button
          type="button"
          className="w-full py-2 bg-surface-container-lowest border border-outline-variant/50 rounded-lg text-xs font-bold text-on-surface hover:bg-surface-container transition-colors"
        >
          会社概要を詳しく見る
        </button>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  text,
  textClass,
}: {
  icon: string;
  text: string;
  textClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 text-xs text-on-surface-variant">
      <Icon name={icon} className="text-sm text-outline shrink-0" />
      <span className={cn("truncate", textClass)}>{text}</span>
    </div>
  );
}

function EventPromoCard({
  event,
}: {
  event: NonNullable<ChatConversation["detail"]["event"]>;
}) {
  return (
    <div className="bg-primary-container p-6 rounded-xl shadow-sm text-white relative overflow-hidden shrink-0">
      <div
        aria-hidden
        className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"
      />
      <h4 className="text-sm font-bold mb-2">{event.title}</h4>
      <p className="text-xs text-on-primary-container mb-4 leading-relaxed">
        {event.scheduleLabel}
        <br />
        {event.description}
      </p>
      <button
        type="button"
        className="text-xs font-bold text-white flex items-center gap-1 group"
      >
        詳細を確認する
        <Icon
          name="arrow_forward"
          className="text-xs group-hover:translate-x-1 transition-transform"
        />
      </button>
    </div>
  );
}

const AVATAR_SIZE_CLASS = {
  8: "w-8 h-8 text-[10px]",
  10: "w-10 h-10 text-xs",
  12: "w-12 h-12 text-xs",
} as const;

function Avatar({
  name,
  initials,
  size,
  rounded = "full",
}: {
  name: string;
  initials?: string;
  size: 8 | 10 | 12;
  rounded?: "full" | "lg";
}) {
  const label = initials ?? name.slice(0, 2);
  return (
    <div
      className={cn(
        AVATAR_SIZE_CLASS[size],
        rounded === "full" ? "rounded-full" : "rounded-lg",
        "bg-primary-container text-white grid place-items-center font-bold shrink-0",
      )}
      aria-label={name}
    >
      {label}
    </div>
  );
}

function DetailPlaceholder() {
  return (
    <div className="h-full grid place-items-center p-10">
      <div className="text-center">
        <Icon name="chat_bubble_outline" className="text-outline text-4xl mb-2" />
        <p className="text-sm font-semibold text-on-surface-variant">
          左のリストから会話を選択してください
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="relative -mx-6 md:-mx-10 -mt-10 md:-mt-10 md:-mb-16 min-h-[calc(100vh-8rem)] md:min-h-[calc(100vh-2.5rem)] overflow-hidden grid place-items-center p-6">
      <HeroBackground />
      <div className="relative glass-panel rounded-xl shadow-sm max-w-md w-full p-10 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-surface-container grid place-items-center mb-5">
          <Icon name="forum" className="text-primary-container text-3xl" />
        </div>
        <h2 className="text-base font-bold text-on-surface mb-2">
          チャットできる相手はまだいません
        </h2>
        <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
          スカウトは、企業からの提案を
          <strong className="text-on-surface font-bold">承諾</strong>
          した段階でチャットが開始されます。
          <br />
          受信箱で気になるスカウトを確認してみましょう。
        </p>
        <a
          href="/student/scout"
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-container text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
        >
          <Icon name="inbox" className="text-sm" />
          スカウト受信箱を開く
        </a>
      </div>
    </div>
  );
}

