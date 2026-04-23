import type { SupabaseClient } from "@supabase/supabase-js";
import type { BucketId } from "./buckets";

export function getPublicUrl(
  supabase: SupabaseClient,
  bucket: BucketId,
  path: string,
): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
