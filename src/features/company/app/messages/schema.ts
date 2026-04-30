export type ChatAttachmentKind = "image" | "video" | "file";

export type ChatAttachment = {
  id: string;
  kind: ChatAttachmentKind;
  name: string;
  path: string;
  mimeType: string | null;
  sizeBytes: number | null;
};

export type ChatMessageRow = {
  id: string;
  scoutId: string;
  senderId: string;
  senderRole: "student" | "company_member";
  senderDisplay: "me" | "them";
  content: string;
  createdAt: string;
  readAt: string | null;
  attachments: ChatAttachment[];
};
