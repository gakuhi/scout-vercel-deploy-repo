import type { ScoutDisplayStatus } from "../schema";

/**
 * DB の `scouts.status` + `read_at` + `expires_at` を、UI 表示用の単一ステータスに畳む。
 * - `expires_at` が現在時刻より過去なら、DB の status に関係なく `"expired"` 扱い。
 * - `status` が `"accepted"` / `"declined"` / `"expired"` ならそのまま流用。
 * - それ以外（`"sent"`）は `read_at` の有無で `"new"` / `"read"` を返す。
 *
 * 引数は最小限の構造的型にして、DB のフルスキーマと無関係にテスト・再利用できるようにする。
 */
export function toDisplayStatus(
  row: {
    status: "sent" | "accepted" | "declined" | "expired";
    read_at: string | null;
    expires_at: string | null;
  },
  now: Date = new Date(),
): ScoutDisplayStatus {
  if (row.expires_at && new Date(row.expires_at) < now) {
    return "expired";
  }
  if (row.status === "accepted") return "accepted";
  if (row.status === "declined") return "declined";
  if (row.status === "expired") return "expired";
  return row.read_at ? "read" : "new";
}

/**
 * 送信者の姓名から「姓 名」のフルネーム文字列を生成。両方 null なら null。
 * 片方だけ埋まっている場合はそのまま返す。
 */
export function formatSender(
  member: { last_name: string | null; first_name: string | null } | null,
): string | null {
  if (!member) return null;
  const parts = [member.last_name, member.first_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}
