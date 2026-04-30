"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/shared/utils/cn";
import { createClient } from "@/lib/supabase/client";
import {
  sendMessage,
  deleteMessage,
  getMessages,
  markMessagesAsReadAction,
  getAttachmentSignedUrls,
  uploadAttachment,
  getScoutInfo,
} from "@/features/company/app/messages/actions";
import type { ScoutInfo } from "@/features/company/app/messages/actions";
import type { ChatDetail, ChatThread } from "@/features/company/app/messages/queries";
import type { ChatAttachment, ChatMessageRow } from "@/features/company/app/messages/schema";
import { getStudentDetailAction } from "@/features/company/app/students/actions";
import { StudentDetailDrawer } from "@/features/company/app/students/components/student-detail-drawer";
import type { ProfileMock } from "@/features/student/profile/mock";

// --- Format helpers ---

function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const dayMs = 86400000;
  const toMid = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((toMid(now) - toMid(d)) / dayMs);
  if (diff === 0) return "今日";
  if (diff === 1) return "昨日";
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString("ja-JP", { month: "long", day: "numeric" });
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const min = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return formatTime(iso);
  if (hour < 48) return "昨日";
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}日前`;
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const DELETE_WINDOW_MS = 60_000;
const NEW_THREAD_MS = 24 * 60 * 60 * 1000; // 24h

function isNewThread(startedAt: string | null): boolean {
  if (!startedAt) return false;
  return Date.now() - new Date(startedAt).getTime() < NEW_THREAD_MS;
}

// --- Props ---

type ChatViewProps = {
  threads: ChatThread[];
  initialChat: ChatDetail | null;
};

// --- Main Component: 3-Pane ---

export function ChatView({ threads, initialChat }: ChatViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialChat?.scoutId ?? null);
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessageRow[]>>(
    initialChat ? { [initialChat.scoutId]: initialChat.messages } : {},
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [unreadAnchors, setUnreadAnchors] = useState<Record<string, string | null>>({});
  const [sendError, setSendError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [scoutInfoMap, setScoutInfoMap] = useState<Record<string, ScoutInfo>>(
    initialChat
      ? { [initialChat.scoutId]: { scoutSubject: initialChat.scoutSubject, scoutMessage: initialChat.scoutMessage, jobPostingTitle: initialChat.jobPostingTitle } }
      : {},
  );
  const [drawerStudent, setDrawerStudent] = useState<ProfileMock | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [readScoutIds, setReadScoutIds] = useState<Set<string>>(
    initialChat ? new Set([initialChat.scoutId]) : new Set(),
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unreadDividerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedIdRef = useRef(selectedId);
  const initialScrolledRef = useRef<Set<string>>(new Set());

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  const draft = selectedId ? (drafts[selectedId] ?? "") : "";
  const messages = selectedId ? (messagesMap[selectedId] ?? []) : [];

  // スレッド一覧を messagesMap の最新状態で上書き
  const liveThreads = useMemo(() => {
    return threads.map((t) => {
      const msgs = messagesMap[t.scoutId];
      const unreadCount = readScoutIds.has(t.scoutId) ? 0 : t.unreadCount;
      if (!msgs) return { ...t, unreadCount };
      const last = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      return {
        ...t,
        unreadCount,
        lastMessage: last ? (last.content.trim() || t.lastMessage) : null,
        lastMessageAt: last?.createdAt ?? t.lastMessageAt,
        lastSenderRole: last?.senderRole ?? t.lastSenderRole,
      };
    });
  }, [threads, messagesMap, readScoutIds]);

  const selectedThread = useMemo(
    () => liveThreads.find((t) => t.scoutId === selectedId) ?? null,
    [liveThreads, selectedId],
  );
  const chatDetail = initialChat?.scoutId === selectedId ? initialChat : null;
  const currentScoutInfo = selectedId ? (scoutInfoMap[selectedId] ?? null) : null;

  // --- Append message (dedup) ---
  function appendMessage(scoutId: string, row: ChatMessageRow) {
    setMessagesMap((prev) => {
      const existing = prev[scoutId] ?? [];
      if (existing.some((m) => m.id === row.id)) return prev;
      return { ...prev, [scoutId]: [...existing, row] };
    });
  }

  // --- Remove message (optimistic delete) ---
  function removeMessage(scoutId: string, messageId: string) {
    setMessagesMap((prev) => {
      const existing = prev[scoutId] ?? [];
      return { ...prev, [scoutId]: existing.filter((m) => m.id !== messageId) };
    });
  }

  // --- Unread anchor snapshot ---
  useEffect(() => {
    if (!selectedId) return;
    if (selectedId in unreadAnchors) return;
    const msgs = messagesMap[selectedId];
    // メッセージがまだ読み込まれていない場合はスキップ（読み込み後に再実行される）
    if (!msgs) return;
    const firstUnread = msgs.find((m) => m.senderDisplay === "them" && !m.readAt);
    setUnreadAnchors((prev) => ({ ...prev, [selectedId]: firstUnread?.id ?? null }));
    if (firstUnread) markMessagesAsReadAction(selectedId);
  }, [selectedId, messagesMap, unreadAnchors]);

  // --- Scroll: 初回は未読 divider があればそこへ、無ければ最下部。以降のメッセージ追加では常に最下部へ ---
  useEffect(() => {
    if (!selectedId || messages.length === 0) return;
    // unreadAnchors の設定が終わってから判定する（同 effect で別途設定される）
    if (!(selectedId in unreadAnchors)) return;

    const isFirstScroll = !initialScrolledRef.current.has(selectedId);
    if (isFirstScroll) {
      initialScrolledRef.current.add(selectedId);
      const anchorId = unreadAnchors[selectedId];
      if (anchorId && unreadDividerRef.current) {
        unreadDividerRef.current.scrollIntoView({ block: "start" });
        return;
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, unreadAnchors, selectedId]);

  // --- Signed URL fetching for image attachments ---
  const fetchedPathsRef = useRef(new Set<string>());
  const fetchSignedUrls = useCallback(async (msgs: ChatMessageRow[]) => {
    const paths = msgs
      .flatMap((m) => m.attachments)
      .filter((a) => a.kind === "image" && !fetchedPathsRef.current.has(a.path))
      .map((a) => a.path);
    if (paths.length === 0) return;
    for (const p of paths) fetchedPathsRef.current.add(p);
    const urls = await getAttachmentSignedUrls(paths);
    setSignedUrls((prev) => ({ ...prev, ...urls }));
  }, []);

  useEffect(() => {
    if (messages.length > 0) fetchSignedUrls(messages);
  }, [messages, fetchSignedUrls]);

  // --- Supabase Realtime ---
  const threadScoutIds = useMemo(() => new Set(threads.map((t) => t.scoutId)), [threads]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("company-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const row = payload.new as {
            id: string;
            scout_id: string;
            sender_id: string;
            sender_role: string;
            content: string;
            created_at: string;
            read_at: string | null;
            attachments: ChatAttachment[] | null;
          };
          // 自社スカウト以外は無視
          if (!threadScoutIds.has(row.scout_id)) return;

          appendMessage(row.scout_id, {
            id: row.id,
            scoutId: row.scout_id,
            senderId: row.sender_id,
            senderRole: row.sender_role as "student" | "company_member",
            senderDisplay: row.sender_role === "company_member" ? "me" : "them",
            content: row.content,
            createdAt: row.created_at,
            readAt: row.read_at,
            attachments: Array.isArray(row.attachments) ? row.attachments : [],
          });
          // 相手のメッセージなら既読化
          if (row.sender_role === "student" && selectedIdRef.current === row.scout_id) {
            markMessagesAsReadAction(row.scout_id);
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [threadScoutIds]);

  // --- Thread select ---
  async function handleSelectThread(scoutId: string) {
    setSelectedId(scoutId);
    setSendError(null);
    setReadScoutIds((prev) => {
      if (prev.has(scoutId)) return prev;
      const next = new Set(prev);
      next.add(scoutId);
      return next;
    });
    if (!messagesMap[scoutId]) {
      const msgs = await getMessages(scoutId);
      setMessagesMap((prev) => ({ ...prev, [scoutId]: msgs }));
    }
    if (!scoutInfoMap[scoutId]) {
      const info = await getScoutInfo(scoutId);
      if (info) setScoutInfoMap((prev) => ({ ...prev, [scoutId]: info }));
    }
    await markMessagesAsReadAction(scoutId);
    // URL更新のみ（ページ遷移せずstateを保持する）
    window.history.replaceState(null, "", `/company/messages/${scoutId}`);
  }

  // --- Send ---
  async function handleSend() {
    if (!selectedId || (!draft.trim())) return;
    setIsPending(true);
    setSendError(null);
    const result = await sendMessage(selectedId, draft.trim());
    setIsPending(false);
    if (result.ok) {
      appendMessage(selectedId, result.message);
      setDrafts((prev) => ({ ...prev, [selectedId]: "" }));
      inputRef.current?.focus();
    } else {
      setSendError(result.error);
    }
  }

  // --- Delete ---
  async function handleDelete(messageId: string) {
    if (!selectedId) return;
    removeMessage(selectedId, messageId);
    await deleteMessage(messageId);
  }

  // --- Attach file ---
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedId || !e.target.files?.length) return;
    const file = e.target.files[0];
    e.target.value = "";

    setIsPending(true);
    setSendError(null);

    const fd = new FormData();
    fd.set("file", file);
    const uploadRes = await uploadAttachment(selectedId, fd);

    if (!uploadRes.ok) {
      setIsPending(false);
      setSendError(uploadRes.error);
      return;
    }

    const result = await sendMessage(selectedId, "", [uploadRes.attachment]);
    setIsPending(false);
    if (result.ok) {
      appendMessage(selectedId, result.message);
    } else {
      setSendError(result.error);
    }
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] -mx-10">
      {/* Pane 1: Thread List */}
      <div className="w-80 shrink-0 bg-surface-container-lowest overflow-y-auto border-r border-surface-container-high">
        <div className="p-4">
          <h2 className="text-sm font-bold text-primary-container mb-4">メッセージ</h2>
          {threads.length === 0 ? (
            <p className="text-xs text-outline text-center py-10">承諾済みのスカウトがありません</p>
          ) : (
            <div className="space-y-1">
              {liveThreads.map((t) => (
                <button
                  key={t.scoutId}
                  type="button"
                  onClick={() => handleSelectThread(t.scoutId)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-colors",
                    selectedId === t.scoutId ? "bg-primary-container/10" : "hover:bg-surface-container-low",
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={cn("text-sm truncate", t.unreadCount > 0 ? "font-bold text-primary-container" : "font-medium text-on-surface")}>
                        {t.studentName ?? "名前未設定"}
                      </span>
                      {isNewThread(t.startedAt) && (
                        <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold bg-error text-white rounded">24時間以内に応募</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {t.lastMessageAt && <span className="text-[10px] text-outline-variant">{formatRelative(t.lastMessageAt)}</span>}
                      {t.unreadCount > 0 && (
                        <span className="w-4 h-4 bg-primary-container text-white text-[9px] font-bold rounded-full grid place-items-center">
                          {t.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-outline font-medium truncate">{t.scoutSubject}</p>
                  {t.lastMessage && (
                    <p className={cn("text-xs truncate mt-1", t.unreadCount > 0 ? "text-on-surface font-medium" : "text-outline")}>
                      {t.lastSenderRole === "company_member" && <span className="text-outline-variant">自分: </span>}
                      {t.lastMessage}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pane 2: Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Icon name="chat_bubble_outline" className="text-outline-variant text-5xl mb-3" />
              <p className="text-sm text-outline">スレッドを選択してください</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="shrink-0 px-6 py-3 bg-surface-container-lowest border-b border-surface-container-high flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const headerImageUrl = chatDetail?.profileImageUrl ?? selectedThread?.profileImageUrl ?? null;
                  if (headerImageUrl) {
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={headerImageUrl}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    );
                  }
                  return (
                    <div className="w-8 h-8 rounded-full bg-surface-container-high grid place-items-center">
                      <Icon name="person" className="text-outline text-lg" />
                    </div>
                  );
                })()}
                <div>
                  <p className="text-sm font-bold text-primary-container">
                    {chatDetail?.studentName ?? selectedThread?.studentName ?? ""}
                  </p>
                  <p className="text-[10px] text-outline">
                    {chatDetail?.scoutSubject ?? selectedThread?.scoutSubject ?? ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const studentId = chatDetail?.studentId ?? selectedThread?.studentId;
                  if (!studentId) return;
                  setDrawerLoading(true);
                  setDrawerStudent(null);
                  const res = await getStudentDetailAction(studentId, {
                    includePersonalInfo: true,
                  });
                  setDrawerLoading(false);
                  if (res.data) setDrawerStudent(res.data);
                }}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-primary-container border border-primary-container/30 hover:bg-primary-container/10 transition-colors"
              >
                <Icon name="account_circle" className="text-sm" />
                プロフィールを表示
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
              {/* Scout system message */}
              {currentScoutInfo?.scoutMessage && (
                <div className="mb-4">
                  <div className="mx-auto max-w-lg bg-surface-container-low rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name="mail" className="text-sm text-primary-container" />
                      <span className="text-[10px] font-bold text-primary-container uppercase tracking-wider">スカウト内容</span>
                    </div>
                    <p className="text-xs font-bold text-on-surface mb-1">{currentScoutInfo.scoutSubject}</p>
                    <p className="text-xs text-outline leading-relaxed whitespace-pre-wrap">{currentScoutInfo.scoutMessage}</p>
                    {currentScoutInfo.jobPostingTitle && (
                      <div className="mt-2 pt-2 border-t border-surface-container-high">
                        <span className="text-[10px] text-outline-variant">求人: {currentScoutInfo.jobPostingTitle}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {messages.length === 0 && !currentScoutInfo?.scoutMessage ? (
                <div className="text-center py-10">
                  <p className="text-sm text-outline">最初のメッセージを送りましょう</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const prev = idx > 0 ? messages[idx - 1] : null;
                  const showDate = !prev || !!(msg.createdAt && prev.createdAt && !isSameDay(msg.createdAt, prev.createdAt));
                  const isUnreadAnchor = unreadAnchors[selectedId] === msg.id;

                  return (
                    <div key={msg.id}>
                      {isUnreadAnchor && (
                        <div ref={unreadDividerRef} className="flex items-center gap-3 py-2">
                          <div className="flex-1 h-px bg-error/30" />
                          <span className="text-[10px] text-error font-bold">↓ 新着メッセージ</span>
                          <div className="flex-1 h-px bg-error/30" />
                        </div>
                      )}
                      <MessageBubble
                        msg={msg}
                        showDateDivider={showDate}
                        onDelete={() => handleDelete(msg.id)}
                        signedUrls={signedUrls}
                        studentImageUrl={chatDetail?.profileImageUrl ?? selectedThread?.profileImageUrl ?? null}
                      />
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 px-6 py-3 bg-surface-container-lowest border-t border-surface-container-high">
              {sendError && (
                <div className="mb-2 bg-error-container text-on-error-container p-2 rounded-lg text-xs font-semibold">
                  {sendError}
                </div>
              )}
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm focus-within:border-primary-container transition-colors">
                <div className="flex items-center gap-2 p-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 p-2 text-outline hover:text-primary-container transition-colors"
                    title="ファイルを添付"
                  >
                    <Icon name="attach_file" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                    onChange={handleFileSelect}
                  />
                  <textarea
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [selectedId]: e.target.value }))}
                    placeholder="メッセージを入力..."
                    rows={1}
                    maxLength={5000}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 resize-none max-h-[7.25rem] overflow-y-auto outline-none min-w-0 break-all placeholder:text-outline-variant"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={isPending || !draft.trim()}
                    className="shrink-0 inline-flex items-center justify-center signature-gradient text-white p-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Icon name="send" className="text-sm leading-none" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Student Detail Drawer */}
      <StudentDetailDrawer
        student={drawerStudent}
        isLoading={drawerLoading}
        onClose={() => { setDrawerStudent(null); setDrawerLoading(false); }}
      />
    </div>
  );
}

// --- Sub Components ---

function MessageBubble({
  msg,
  showDateDivider,
  onDelete,
  signedUrls,
  studentImageUrl,
}: {
  msg: ChatMessageRow;
  showDateDivider: boolean;
  onDelete: () => void;
  signedUrls: Record<string, string>;
  studentImageUrl: string | null;
}) {
  const isMe = msg.senderDisplay === "me";
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canDelete = isMe && msg.createdAt && Date.now() - new Date(msg.createdAt).getTime() < DELETE_WINDOW_MS;

  return (
    <>
      {showDateDivider && msg.createdAt && (
        <div className="flex items-center gap-3 py-3">
          <div className="flex-1 h-px bg-surface-container-high" />
          <span className="text-[10px] text-outline-variant font-medium">{formatDateLabel(msg.createdAt)}</span>
          <div className="flex-1 h-px bg-surface-container-high" />
        </div>
      )}
      <div className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
        {/* Avatar for student messages */}
        {!isMe && (
          studentImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={studentImageUrl}
              alt=""
              className="w-8 h-8 rounded-full object-cover shrink-0 mb-5"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-surface-container-high grid place-items-center shrink-0 mb-5">
              <Icon name="person" className="text-outline text-sm" />
            </div>
          )
        )}
        <div className="max-w-[85%]">
          <div className={cn(
            "p-4 shadow-sm",
            isMe
              ? "bg-primary-container text-white rounded-l-xl rounded-tr-xl rounded-br-md"
              : "bg-surface-container-lowest text-on-surface rounded-r-xl rounded-tl-xl rounded-bl-md shadow-md",
          )}>
            {msg.content && <p className="text-sm whitespace-pre-wrap leading-relaxed break-all">{msg.content}</p>}
            {msg.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {msg.attachments.map((a) => (
                  <AttachmentPreview key={a.id} attachment={a} isMe={isMe} signedUrl={signedUrls[a.path] ?? null} />
                ))}
              </div>
            )}
          </div>
          <div className={cn("flex items-center gap-1.5 mt-1 text-[10px]", isMe ? "justify-end" : "")}>
            <span className="text-outline-variant">{msg.createdAt ? formatTime(msg.createdAt) : ""}</span>
            {isMe && msg.readAt && <span className="text-primary-container font-medium">既読</span>}
            {canDelete && (
              confirmDelete ? (
                <span className="flex items-center gap-1 ml-1">
                  <button
                    type="button"
                    onClick={onDelete}
                    className="text-error font-bold hover:underline"
                  >
                    取消する
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-outline-variant hover:underline"
                  >
                    やめる
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="text-outline-variant hover:text-error transition-colors ml-1"
                >
                  送信取消
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function AttachmentPreview({ attachment, isMe, signedUrl }: { attachment: ChatAttachment; isMe: boolean; signedUrl: string | null }) {
  if (attachment.kind === "image") {
    return (
      <div className="rounded-lg overflow-hidden max-w-xs">
        {signedUrl ? (
          <a href={signedUrl} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signedUrl}
              alt={attachment.name}
              className="max-w-full max-h-60 rounded-lg object-cover"
              loading="lazy"
            />
          </a>
        ) : (
          <div className={cn("flex items-center gap-2 text-xs p-2 rounded-lg", isMe ? "bg-white/10" : "bg-surface-container-low")}>
            <Icon name="image" className="text-sm animate-pulse" />
            <span className={isMe ? "text-white/70" : "text-outline"}>読み込み中...</span>
          </div>
        )}
        <p className={cn("text-[10px] mt-1 truncate", isMe ? "text-white/60" : "text-outline-variant")}>{attachment.name}</p>
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-2 text-xs p-2 rounded-lg", isMe ? "bg-white/10 text-white/80" : "bg-surface-container-low text-outline")}>
      <Icon name={attachment.kind === "video" ? "videocam" : "description"} className="text-sm" />
      <span className="truncate">{attachment.name}</span>
      {attachment.sizeBytes && <span className="shrink-0">({formatBytes(attachment.sizeBytes)})</span>}
    </div>
  );
}

