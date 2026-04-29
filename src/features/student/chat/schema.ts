export type ChatParticipant = {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** 企業ロゴの代替で使う Initials 用。avatarUrl が無い場合に表示。 */
  initials?: string;
};

export type ChatAttachmentKind =
  | "image"
  | "video"
  | "file";

export type ChatAttachment = {
  id: string;
  kind: ChatAttachmentKind;
  name: string;
  /** Supabase Storage bucket "chat-attachments" 内の path。`{scout_id}/{uuid}.ext` */
  path: string;
  mimeType: string | null;
  sizeBytes: number | null;
};

/**
 * メッセージの発信者種別。
 * - "me": 自分（学生）
 * - "them": 相手（企業の誰か。複数 company_member の区別はせず一括で "them"）
 * - "preview": 検索結果プレビュー用の擬似行。MessageBubble には到達しない
 */
export type SenderId = "me" | "them" | "preview";

export type ChatMessageRow = {
  id: string;
  conversationId: string;
  senderId: SenderId;
  body: string;
  createdAt: string;
  readAt: string | null;
  attachments: ChatAttachment[];
};

export type ChatConversation = {
  id: string;
  /** スカウトに紐づく会話。scout_id と対応（MVP では 1:1）。 */
  scoutId: string;
  company: ChatParticipant;
  /** 最新メッセージのプレビュー。一覧ペインで表示。 */
  lastMessage: {
    body: string;
    at: string;
  };
  /** チャット開始時刻（スカウト承諾時刻）。NEW バッジの 24h 判定に使う。 */
  startedAt: string;
  unreadCount: number;
  online: boolean;
  /** 詳細ペインに出す、スカウトのサマリ情報。 */
  detail: {
    industry: string;
    phaseLabel: string;
    /** 企業プロフィール（DB 取得できたもののみ）。 */
    description: string | null;
    address: string | null;
    employeeCountRange: string | null;
    websiteUrl: string | null;
    interestLevel: 0 | 1 | 2 | 3 | 4 | 5;
    heroImageUrl: string | null;
    files: Array<{
      id: string;
      name: string;
      sizeLabel: string;
      dateLabel: string;
      kind: "pdf" | "image" | "other";
    }>;
    /** イベント情報。ある企業のみ設定される（無いなら詳細カードのみ表示）。 */
    event?: {
      title: string;
      scheduleLabel: string;
      description: string;
    };
  };
};
