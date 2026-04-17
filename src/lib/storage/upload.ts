import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKETS, type BucketId } from "./buckets";
import { validateFile } from "./validate";

export type UploadOptions = {
  upsert?: boolean;
  contentType?: string;
  cacheControl?: string;
};

export async function uploadFile(
  supabase: SupabaseClient,
  bucket: BucketId,
  path: string,
  file: File,
  options: UploadOptions = {},
): Promise<string> {
  validateFile(file, BUCKETS[bucket]);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: options.upsert ?? true,
      contentType: options.contentType ?? file.type,
      cacheControl: options.cacheControl ?? "3600",
    });

  if (error) {
    throw error;
  }

  return path;
}
