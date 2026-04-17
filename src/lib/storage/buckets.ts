export type BucketConfig = {
  maxSize: number;
  allowedMimeTypes: readonly string[];
};

export const BUCKETS = {
  avatars: {
    maxSize: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
} as const satisfies Record<string, BucketConfig>;

export type BucketId = keyof typeof BUCKETS;
