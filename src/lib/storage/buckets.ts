export type BucketConfig = {
  maxSize: number;
  allowedMimeTypes: readonly string[];
};

export const BUCKETS = {
  "company-logos": {
    maxSize: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  "job-images": {
    maxSize: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  "profile-images": {
    maxSize: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
} as const satisfies Record<string, BucketConfig>;

export type BucketId = keyof typeof BUCKETS;
