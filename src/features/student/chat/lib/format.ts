import type {
  ChatAttachmentKind,
  ChatMessageRow,
} from "../schema";

/**
 * chat_messages.sender_role を UI 表示用の SenderId に正規化する。
 * DB ロード経路と Realtime 受信経路の両方で同じ関数を通すことで、
 * 同一発信者の連続判定（showAvatar）が経路間で食い違うのを防ぐ。
 */
export function normalizeSenderId(
  role: "student" | "company_member",
): "me" | "them" {
  return role === "student" ? "me" : "them";
}

/** ファイルサイズを「1.2 MB」形式に整形。 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** File の MIME を読んで添付種別を判定。判別不能は "file"。 */
export function detectAttachmentKind(file: File): ChatAttachmentKind {
  const t = file.type || "";
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  return "file";
}

/**
 * 会話一覧の最新メッセージプレビュー。本文があればそれを使い、
 * 本文が空で添付のみのときは添付種別ラベル（[画像] 等）を出す。
 */
export function formatLastMessagePreview(msg: ChatMessageRow): string {
  if (msg.body.trim().length > 0) return msg.body;
  const first = msg.attachments[0];
  if (!first) return "";
  const label =
    first.kind === "image"
      ? "画像"
      : first.kind === "video"
        ? "動画"
        : "ファイル";
  const extra =
    msg.attachments.length > 1 ? ` ほか${msg.attachments.length - 1}件` : "";
  return `[${label}]${extra}`;
}

/**
 * Storage path → 表示可能な URL を解決。
 * blob:/http(s): 始まりは外部 URL とみなしてそのまま、それ以外は urls から
 * 署名 URL を引く（mock は object URL の直渡しを許容）。
 */
export function resolveAttachmentUrl(
  path: string,
  urls: Record<string, string>,
): string | null {
  if (/^(blob|https?):/.test(path)) return path;
  return urls[path] ?? null;
}

/** ISO 文字列が現在時刻から 24 時間以内かどうか。NEW バッジ判定等に使う。 */
export function isWithinDay(iso: string, now: Date = new Date()): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return now.getTime() - d.getTime() < 24 * 60 * 60 * 1000;
}

/** 2 つの日時が同じカレンダー日（年月日一致）かどうか。日付 divider 判定で使う。 */
export function isSameDay(aIso: string, bIso: string): boolean {
  const a = new Date(aIso);
  const b = new Date(bIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "今日" / "昨日" / "M月D日" / "YYYY年M月D日" を文脈で切替。 */
export function formatDateLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dayMs = 24 * 60 * 60 * 1000;
  const toMidnight = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((toMidnight(now) - toMidnight(d)) / dayMs);
  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "昨日";
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("ja-JP", { month: "long", day: "numeric" });
  }
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** "10:23" 形式の時刻文字列。 */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * "たった今" / "X分前" / "HH:MM" / "昨日" / "X日前" / "M月D日" を経過時間で切替。
 * 一覧の最終メッセージ時刻表示に使う。
 */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = now.getTime() - d.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) {
    return d.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const day = Math.floor(hour / 24);
  if (day < 2) return "昨日";
  if (day < 7) return `${day}日前`;
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

/** "M/D(曜)" 形式の日付（面談候補スロットのラベル等で使用）。 */
export function formatDateMd(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekday})`;
}
