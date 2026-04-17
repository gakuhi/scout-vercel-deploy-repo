import type { SupabaseClient } from "@supabase/supabase-js";
import type { BucketId } from "./buckets";

export async function deleteFile(
  supabase: SupabaseClient,
  bucket: BucketId,
  path: string,
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw error;
  }
}
