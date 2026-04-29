import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/storage";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const PROFILE_IMAGE_SIGNED_URL_TTL = 60 * 60; // 1 時間

/**
 * DB 上の profile_image_url を <img src> に使える URL へ解決する。
 * - 自バケットの path（例: "uid/avatar.jpg"）→ 署名 URL を発行
 * - 外部 URL（LINE CDN 等）→ そのまま返す
 * - null / 失敗 → null
 */
export async function resolveProfileImageUrl(
  supabase: SupabaseServerClient,
  raw: string | null,
): Promise<string | null> {
  if (!raw) return null;
  if (/^https?:\/\//.test(raw)) return raw;
  try {
    return await getSignedUrl(
      supabase,
      "profile-images",
      raw,
      PROFILE_IMAGE_SIGNED_URL_TTL,
    );
  } catch {
    return null;
  }
}
