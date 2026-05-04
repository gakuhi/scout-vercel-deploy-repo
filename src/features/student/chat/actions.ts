"use server";

import { notify } from "@/features/notification";
import { createClient } from "@/lib/supabase/server";
import { formatLastMessagePreview, normalizeSenderId } from "./lib/format";
import type {
  ChatAttachment,
  ChatConversation,
  ChatMessageRow,
} from "./schema";

export type SendMessageResult =
  | { ok: true; message: ChatMessageRow }
  | { ok: false; error: string };

type ScoutRow = {
  id: string;
  subject: string;
  sent_at: string;
  responded_at: string | null;
  company: {
    id: string;
    name: string;
    industry: string | null;
    logo_url: string | null;
    description: string | null;
    employee_count_range: string | null;
    website_url: string | null;
    prefecture: string | null;
    city: string | null;
    street: string | null;
  };
};

type ChatMessageDbRow = {
  id: string;
  scout_id: string;
  sender_id: string;
  sender_role: "student" | "company_member";
  content: string;
  read_at: string | null;
  created_at: string;
  attachments: ChatAttachment[] | null;
};

/**
 * 学生の accepted スカウトに紐づく会話一覧を返す。
 *
 * - RLS でそもそも自分のスカウトしか引けないが、念のため student_id フィルタも付ける
 * - 各会話の「最新メッセージ」と「自分宛の未読件数」を同時にまとめる
 * - メッセージゼロの会話はスカウトの subject/sent_at をプレビューの代替にする
 */
export async function getConversations(): Promise<ChatConversation[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: scoutsRaw } = await supabase
    .from("scouts")
    .select(
      `id, subject, sent_at, responded_at,
       company:companies (
         id, name, industry, logo_url, description,
         employee_count_range, website_url,
         prefecture, city, street
       )`,
    )
    .eq("student_id", user.id)
    .eq("status", "accepted")
    .order("sent_at", { ascending: false });

  const scouts = (scoutsRaw ?? []) as unknown as ScoutRow[];
  if (scouts.length === 0) return [];

  const scoutIds = scouts.map((s) => s.id);

  const { data: messagesRaw } = await supabase
    .from("chat_messages")
    .select("id, scout_id, sender_id, sender_role, content, read_at, created_at, attachments")
    .in("scout_id", scoutIds)
    .order("created_at", { ascending: false });

  const messages = (messagesRaw ?? []) as ChatMessageDbRow[];

  const latestByScout = new Map<string, ChatMessageDbRow>();
  const unreadByScout = new Map<string, number>();
  for (const m of messages) {
    if (!latestByScout.has(m.scout_id)) latestByScout.set(m.scout_id, m);
    if (m.sender_role !== "student" && m.read_at === null) {
      unreadByScout.set(m.scout_id, (unreadByScout.get(m.scout_id) ?? 0) + 1);
    }
  }

  return scouts.map((s) => scoutToConversation(s, latestByScout, unreadByScout));
}

/** 指定スカウトの全メッセージを時系列で返す。 */
export async function getMessages(scoutId: string): Promise<ChatMessageRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_messages")
    .select("id, scout_id, sender_id, sender_role, content, read_at, created_at, attachments")
    .eq("scout_id", scoutId)
    .order("created_at", { ascending: true });
  return ((data ?? []) as ChatMessageDbRow[]).map(dbRowToMessage);
}

/**
 * テキストメッセージを送信する。
 *
 * - Issue #112 要件「RLS + アプリ層で二重制御」に従い、INSERT 前に
 *   scouts を一度 SELECT して当事者かつ accepted であることを確認する
 *   （RLS 側でも同条件で弾くが、アプリ層で先に切ることで UX メッセージを分離）
 * - 成功時は挿入行を返し、client 側の楽観追加で表示中のメッセージを確定できる
 * - 送信成功後にスカウト送信元の企業担当者へ chat_new_message 通知を送る
 */
export async function sendMessage(
  scoutId: string,
  content: string,
  attachments: ChatAttachment[] = [],
): Promise<SendMessageResult> {
  const trimmed = content.trim();
  if (!trimmed && attachments.length === 0) {
    return { ok: false, error: "メッセージを入力してください" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { data: scout } = await supabase
    .from("scouts")
    .select("status, sender_id")
    .eq("id", scoutId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!scout) {
    return { ok: false, error: "対象のスカウトが見つかりません" };
  }
  if (scout.status !== "accepted") {
    return {
      ok: false,
      error: "承諾済みのスカウトでのみメッセージを送信できます",
    };
  }

  // 添付のパスは `{scout_id}/...` である必要がある（RLS 検証）。不正 path は弾く。
  for (const a of attachments) {
    if (!a.path.startsWith(`${scoutId}/`)) {
      return { ok: false, error: "添付の参照が不正です" };
    }
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      scout_id: scoutId,
      sender_id: user.id,
      sender_role: "student",
      content: trimmed,
      attachments,
    })
    .select("id, scout_id, sender_id, sender_role, content, read_at, created_at, attachments")
    .single();

  if (error || !data) {
    // INSERT 失敗時は既にアップロード済みの添付を掃除する（best-effort）
    if (attachments.length > 0) {
      await supabase.storage
        .from("chat-attachments")
        .remove(attachments.map((a) => a.path));
    }
    return { ok: false, error: "送信に失敗しました。時間をおいて再度お試しください。" };
  }

  // 企業担当者へチャット新着通知（失敗してもメッセージ送信自体は成功扱い）
  notify({
    userId: scout.sender_id,
    recipientRole: "company_member",
    type: "chat_new_message",
    title: "学生からメッセージが届きました",
    body: trimmed.slice(0, 100),
    referenceType: "scouts",
    referenceId: scoutId,
  }).catch((e) => {
    console.error("[sendMessage] notify failed:", e);
  });

  return { ok: true, message: dbRowToMessage(data as ChatMessageDbRow) };
}

/**
 * 自分が送信した chat_message を 1 件削除する（送信取消）。
 *
 * - 学生側 UI から 60 秒以内の自分メッセージに対してのみ呼ばれる想定
 * - 現状の RLS / GRANT に DELETE の許可は無いため、サーバー側は best-effort
 *   （許可ポリシーが追加されるまではローカルの表示だけが消える）
 */
export async function deleteMessage(messageId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // row を先に引いて添付 path を把握する（DELETE 後は参照できないため）
  const { data: row } = await supabase
    .from("chat_messages")
    .select("attachments")
    .eq("id", messageId)
    .eq("sender_id", user.id)
    .maybeSingle();
  const paths: string[] = Array.isArray(row?.attachments)
    ? (row.attachments as ChatAttachment[]).map((a) => a.path).filter(Boolean)
    : [];

  await supabase
    .from("chat_messages")
    .delete()
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (paths.length > 0) {
    await supabase.storage.from("chat-attachments").remove(paths);
  }
}

/**
 * 添付 path のリストに対して署名付き URL を発行する。
 *
 * - RLS で他人のスカウト添付は読めないため、勝手な path を渡しても失敗する
 * - 期限は 60 分。メッセージ一覧を描く時に client がまとめて取得する想定
 */
export async function getAttachmentSignedUrls(
  paths: string[],
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("chat-attachments")
    .createSignedUrls(paths, 60 * 60);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const r of data) {
    if (r.path && r.signedUrl) map[r.path] = r.signedUrl;
  }
  return map;
}

/**
 * 指定スカウトの「自分以外から届いた未読メッセージ」を既読化する。
 *
 * - GRANT で UPDATE は `read_at` 列のみ許可される
 * - RLS `chat_messages_update_read` により、相手の書いた行かつ自分のスカウトのみ通る
 */
export async function markMessagesAsRead(scoutId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("chat_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("scout_id", scoutId)
    .is("read_at", null)
    .neq("sender_id", user.id);
}

function scoutToConversation(
  s: ScoutRow,
  latestByScout: Map<string, ChatMessageDbRow>,
  unreadByScout: Map<string, number>,
): ChatConversation {
  const latest = latestByScout.get(s.id);
  const address = [s.company.prefecture, s.company.city, s.company.street]
    .filter(Boolean)
    .join(" ");
  return {
    id: s.id,
    scoutId: s.id,
    company: {
      id: s.company.id,
      name: s.company.name,
      avatarUrl: s.company.logo_url,
      initials: s.company.name.slice(0, 2),
    },
    lastMessage: latest
      ? {
          body: formatLastMessagePreview(dbRowToMessage(latest)),
          at: latest.created_at,
        }
      : { body: s.subject, at: s.sent_at },
    // responded_at（承諾時刻）を「チャット開始」とみなす。未セット時は送信時刻で代替。
    startedAt: s.responded_at ?? s.sent_at,
    unreadCount: unreadByScout.get(s.id) ?? 0,
    online: false,
    detail: {
      industry: s.company.industry ?? "",
      phaseLabel: "やりとり中",
      interestLevel: 0,
      description: s.company.description,
      address: address || null,
      employeeCountRange: s.company.employee_count_range,
      websiteUrl: s.company.website_url,
      heroImageUrl: null,
      files: [],
    },
  };
}

function dbRowToMessage(r: ChatMessageDbRow): ChatMessageRow {
  return {
    id: r.id,
    conversationId: r.scout_id,
    senderId: normalizeSenderId(r.sender_role),
    body: r.content,
    createdAt: r.created_at,
    readAt: r.read_at,
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
  };
}
