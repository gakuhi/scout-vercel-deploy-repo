import type { BucketConfig } from "./buckets";

export function validateFile(file: File, config: BucketConfig): void {
  if (!config.allowedMimeTypes.includes(file.type)) {
    throw new Error(
      `ファイル形式が不正です。許可されている形式: ${config.allowedMimeTypes.join(", ")}`,
    );
  }

  if (file.size > config.maxSize) {
    const maxMb = Math.round(config.maxSize / 1024 / 1024);
    throw new Error(`ファイルサイズは ${maxMb}MB 以下にしてください`);
  }
}
