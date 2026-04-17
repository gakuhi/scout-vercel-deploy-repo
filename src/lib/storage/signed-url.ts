import type { SupabaseClient } from "@supabase/supabase-js";
import type { BucketId } from "./buckets";

export async function getSignedUrl(
  supabase: SupabaseClient,
  bucket: BucketId,
  path: string,
  expiresIn = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

export type SignedUrlResult = {
  path: string | null;
  signedUrl: string;
  error: string | null;
};

export async function getSignedUrls(
  supabase: SupabaseClient,
  bucket: BucketId,
  paths: string[],
  expiresIn = 3600,
): Promise<SignedUrlResult[]> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, expiresIn);

  if (error) {
    throw error;
  }

  return data;
}
