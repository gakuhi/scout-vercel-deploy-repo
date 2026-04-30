"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCompanyMembership } from "./queries";
import type { ChatAttachment, ChatMessageRow } from "./schema";

// --- メッセージ送信 ---

export type SendMessageResult =
  | { ok: true; message: ChatMessageRow }
  | { ok: false; error: string };

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
  if (!user) return { ok: false, error: "ログインが必要です" };

  const membership = await getCompanyMembership(user.id);
  if (!membership) return { ok: false, error: "企業情報が見つかりません" };

  const { data: scout } = await supabase
    .from("scouts")
    .select("status")
    .eq("id", scoutId)
    .eq("company_id", membership.companyId)
    .maybeSingle();

  if (!scout) return { ok: false, error: "対象のスカウトが見つかりません" };
  if (scout.status !== "accepted") {
    return { ok: false, error: "承諾済みのスカウトでのみメッセージを送信できます" };
  }

  // 添付パスの検証
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
      sender_role: "company_member",
      content: trimmed,
      attachments,
    })
    .select("id, scout_id, sender_id, sender_role, content, read_at, created_at, attachments")
    .single();

  if (error || !data) {
    if (attachments.length > 0) {
      await supabase.storage
        .from("chat-attachments")
        .remove(attachments.map((a) => a.path));
    }
    console.error("sendMessage error:", error);
    return { ok: false, error: "送信に失敗しました" };
  }

  revalidatePath(`/company/messages/${scoutId}`);
  return {
    ok: true,
    message: {
      id: data.id,
      scoutId: data.scout_id,
      senderId: data.sender_id,
      senderRole: data.sender_role as "company_member",
      senderDisplay: "me",
      content: data.content,
      createdAt: data.created_at,
      readAt: data.read_at,
      attachments: Array.isArray(data.attachments) ? data.attachments as ChatAttachment[] : [],
    },
  };
}

// --- 送信取消 ---

export async function deleteMessage(messageId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

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

// --- 署名URL ---

export async function getAttachmentSignedUrls(
  paths: string[],
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const membership = await getCompanyMembership(user.id);
  if (!membership) return {};

  // パスの先頭セグメント（scoutId）が自社スカウトか検証
  const scoutIds = [...new Set(paths.map((p) => p.split("/")[0]))];
  const { data: scouts } = await supabase
    .from("scouts")
    .select("id")
    .in("id", scoutIds)
    .eq("company_id", membership.companyId);

  const allowedIds = new Set((scouts ?? []).map((s) => s.id));
  const allowedPaths = paths.filter((p) => allowedIds.has(p.split("/")[0]));
  if (allowedPaths.length === 0) return {};

  const { data, error } = await supabase.storage
    .from("chat-attachments")
    .createSignedUrls(allowedPaths, 60 * 60);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const r of data) {
    if (r.path && r.signedUrl) map[r.path] = r.signedUrl;
  }
  return map;
}

// --- 既読化 ---

export async function markMessagesAsReadAction(scoutId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("chat_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("scout_id", scoutId)
    .eq("sender_role", "student")
    .is("read_at", null);
}

// --- メッセージ取得（クライアントからの再取得用） ---

export async function getMessages(scoutId: string): Promise<ChatMessageRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const membership = await getCompanyMembership(user.id);
  if (!membership) return [];

  // スカウトが自社所属か検証
  const { data: scout } = await supabase
    .from("scouts")
    .select("id")
    .eq("id", scoutId)
    .eq("company_id", membership.companyId)
    .maybeSingle();
  if (!scout) return [];

  const { data } = await supabase
    .from("chat_messages")
    .select("id, scout_id, sender_id, sender_role, content, read_at, created_at, attachments")
    .eq("scout_id", scoutId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((r) => ({
    id: r.id,
    scoutId: r.scout_id,
    senderId: r.sender_id,
    senderRole: r.sender_role as "student" | "company_member",
    senderDisplay: (r.sender_role === "company_member" ? "me" : "them") as "me" | "them",
    content: r.content,
    createdAt: r.created_at,
    readAt: r.read_at,
    attachments: Array.isArray(r.attachments) ? r.attachments as ChatAttachment[] : [],
  }));
}

// --- ファイルアップロード（サーバーサイド） ---

export type UploadResult =
  | { ok: true; attachment: ChatAttachment }
  | { ok: false; error: string };

export async function uploadAttachment(
  scoutId: string,
  formData: FormData,
): Promise<UploadResult> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "ファイルが選択されていません" };
  if (file.size > 20 * 1024 * 1024) return { ok: false, error: "ファイルサイズは20MB以下にしてください" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const membership = await getCompanyMembership(user.id);
  if (!membership) return { ok: false, error: "企業情報が見つかりません" };

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${scoutId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("chat-attachments")
    .upload(path, file);

  if (uploadError) {
    console.error("uploadAttachment error:", uploadError);
    return { ok: false, error: "ファイルのアップロードに失敗しました" };
  }

  const kind: ChatAttachment["kind"] = file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("video/")
      ? "video"
      : "file";

  return {
    ok: true,
    attachment: {
      id: crypto.randomUUID(),
      kind,
      name: file.name,
      path,
      mimeType: file.type || null,
      sizeBytes: file.size,
    },
  };
}

// --- スカウト情報取得（スレッド切り替え時） ---

export type ScoutInfo = {
  scoutSubject: string;
  scoutMessage: string | null;
  jobPostingTitle: string | null;
};

export async function getScoutInfo(scoutId: string): Promise<ScoutInfo | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const membership = await getCompanyMembership(user.id);
  if (!membership) return null;

  const { data: scout } = await supabase
    .from("scouts")
    .select("subject, message, job_postings(title)")
    .eq("id", scoutId)
    .eq("company_id", membership.companyId)
    .eq("status", "accepted")
    .maybeSingle();

  if (!scout) return null;

  const job = scout.job_postings as unknown as { title: string | null } | null;

  return {
    scoutSubject: scout.subject,
    scoutMessage: scout.message ?? null,
    jobPostingTitle: job?.title ?? null,
  };
}

// --- フォーム用（useActionState互換） ---

export type SendMessageState = {
  error?: string;
  success?: boolean;
};

export async function sendMessageAction(
  _prev: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const scoutId = formData.get("scoutId");
  const content = formData.get("content");
  if (typeof scoutId !== "string" || typeof content !== "string") {
    return { error: "入力内容を確認してください" };
  }

  const result = await sendMessage(scoutId, content);
  if (!result.ok) return { error: result.error };
  return { success: true };
}
