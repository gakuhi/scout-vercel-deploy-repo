import "server-only";
import { createClient } from "@/lib/supabase/server";
import { resolveProfileImageUrl } from "@/features/student/profile/image-url";
import type { ChatAttachment, ChatMessageRow } from "./schema";

export async function getCompanyMembership(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_members")
    .select("company_id, role")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    companyId: data.company_id,
    role: (data.role as string) ?? "member",
  };
}

// --- 型定義 ---

export type ChatThread = {
  scoutId: string;
  studentId: string;
  scoutSubject: string;
  studentName: string | null;
  studentUniversity: string | null;
  profileImageUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastSenderRole: string | null;
  unreadCount: number;
  startedAt: string | null;
};

export type ChatDetail = {
  scoutId: string;
  studentId: string;
  scoutSubject: string;
  scoutMessage: string | null;
  studentName: string | null;
  studentUniversity: string | null;
  profileImageUrl: string | null;
  jobPostingTitle: string | null;
  messages: ChatMessageRow[];
};

// --- スレッド一覧 ---

type ScoutRow = {
  id: string;
  subject: string;
  sent_at: string | null;
  responded_at: string | null;
  student_id: string;
  students: {
    last_name: string | null;
    first_name: string | null;
    university: string | null;
    profile_image_url: string | null;
  } | null;
};

type MessageDbRow = {
  id: string;
  scout_id: string;
  sender_id: string;
  sender_role: "student" | "company_member";
  content: string;
  read_at: string | null;
  created_at: string;
  attachments: ChatAttachment[] | null;
};

export async function listChatThreads(
  companyId: string,
): Promise<ChatThread[]> {
  const supabase = await createClient();

  const { data: scoutsRaw, error } = await supabase
    .from("scouts")
    .select(
      "id, subject, sent_at, responded_at, student_id, students(last_name, first_name, university, profile_image_url)",
    )
    .eq("company_id", companyId)
    .eq("status", "accepted")
    .order("sent_at", { ascending: false });

  if (error) {
    console.error("listChatThreads error:", error);
    return [];
  }

  const scouts = (scoutsRaw ?? []) as unknown as ScoutRow[];
  if (scouts.length === 0) return [];

  // スカウトごとに最新メッセージ1件と未読数を個別取得（全メッセージ一括取得を回避）
  const latestByScout = new Map<string, MessageDbRow>();
  const unreadByScout = new Map<string, number>();

  await Promise.all(
    scouts.map(async (s) => {
      const [latestRes, unreadRes] = await Promise.all([
        supabase
          .from("chat_messages")
          .select("id, scout_id, sender_id, sender_role, content, read_at, created_at, attachments")
          .eq("scout_id", s.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("scout_id", s.id)
          .eq("sender_role", "student")
          .is("read_at", null),
      ]);
      if (latestRes.data) latestByScout.set(s.id, latestRes.data as MessageDbRow);
      if (unreadRes.count) unreadByScout.set(s.id, unreadRes.count);
    }),
  );

  return Promise.all(
    scouts.map(async (s) => {
      const student = s.students;
      const latest = latestByScout.get(s.id);

      return {
        scoutId: s.id,
        studentId: s.student_id,
        scoutSubject: s.subject,
        studentName:
          [student?.last_name, student?.first_name].filter(Boolean).join(" ") ||
          null,
        studentUniversity: student?.university ?? null,
        profileImageUrl: await resolveProfileImageUrl(
          supabase,
          student?.profile_image_url ?? null,
        ),
        lastMessage: latest ? formatPreview(latest) : null,
        lastMessageAt: latest?.created_at ?? null,
        lastSenderRole: latest?.sender_role ?? null,
        unreadCount: unreadByScout.get(s.id) ?? 0,
        startedAt: s.responded_at ?? s.sent_at,
      };
    }),
  );
}

function formatPreview(m: MessageDbRow): string {
  if (m.content.trim()) return m.content;
  const first = m.attachments?.[0];
  if (!first) return "";
  const label = first.kind === "image" ? "画像" : first.kind === "video" ? "動画" : "ファイル";
  return `[${label}]`;
}

// --- チャット詳細 ---

export async function getChatDetail(
  scoutId: string,
  companyId: string,
): Promise<ChatDetail | null> {
  const supabase = await createClient();

  const { data: scout, error } = await supabase
    .from("scouts")
    .select(
      "id, subject, message, student_id, students(last_name, first_name, university, profile_image_url), job_postings(title)",
    )
    .eq("id", scoutId)
    .eq("company_id", companyId)
    .eq("status", "accepted")
    .maybeSingle();

  if (error || !scout) return null;

  const student = scout.students as unknown as {
    last_name: string | null;
    first_name: string | null;
    university: string | null;
    profile_image_url: string | null;
  } | null;

  const job = scout.job_postings as unknown as { title: string | null } | null;

  const { data: messagesRaw } = await supabase
    .from("chat_messages")
    .select("id, scout_id, content, sender_role, sender_id, read_at, created_at, attachments")
    .eq("scout_id", scoutId)
    .order("created_at", { ascending: true });

  return {
    scoutId: scout.id,
    studentId: scout.student_id,
    scoutSubject: scout.subject,
    scoutMessage: scout.message ?? null,
    studentName:
      [student?.last_name, student?.first_name].filter(Boolean).join(" ") ||
      null,
    studentUniversity: student?.university ?? null,
    profileImageUrl: await resolveProfileImageUrl(
      supabase,
      student?.profile_image_url ?? null,
    ),
    jobPostingTitle: job?.title ?? null,
    messages: (messagesRaw ?? []).map((m) => dbRowToMessage(m as MessageDbRow)),
  };
}

function dbRowToMessage(r: MessageDbRow): ChatMessageRow {
  return {
    id: r.id,
    scoutId: r.scout_id,
    senderId: r.sender_id,
    senderRole: r.sender_role,
    senderDisplay: r.sender_role === "company_member" ? "me" : "them",
    content: r.content,
    createdAt: r.created_at,
    readAt: r.read_at,
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
  };
}

// --- 既読化 ---

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
    .eq("sender_role", "student")
    .is("read_at", null);
}
