import { describe, it, expect } from "vitest";
import { validateFile } from "@/lib/storage/validate";
import type { BucketConfig } from "@/lib/storage/buckets";

const config: BucketConfig = {
  maxSize: 1024 * 1024, // 1MB
  allowedMimeTypes: ["image/jpeg", "image/png"],
};

function makeFile(options: { type: string; size: number }): File {
  return new File([new Uint8Array(options.size)], "test.bin", {
    type: options.type,
  });
}

describe("validateFile", () => {
  it("許可された MIME タイプ かつ サイズ内ならエラーを投げない", () => {
    const file = makeFile({ type: "image/jpeg", size: 1024 });
    expect(() => validateFile(file, config)).not.toThrow();
  });

  it("サイズちょうど上限でもエラーを投げない", () => {
    const file = makeFile({ type: "image/png", size: config.maxSize });
    expect(() => validateFile(file, config)).not.toThrow();
  });

  it("許可されていない MIME タイプはエラーを投げる", () => {
    const file = makeFile({ type: "application/pdf", size: 1024 });
    expect(() => validateFile(file, config)).toThrow(/ファイル形式/);
  });

  it("MIME タイプエラーには許可形式の一覧が含まれる", () => {
    const file = makeFile({ type: "application/pdf", size: 1024 });
    expect(() => validateFile(file, config)).toThrow(
      /image\/jpeg, image\/png/,
    );
  });

  it("空の MIME タイプはエラーを投げる", () => {
    const file = makeFile({ type: "", size: 1024 });
    expect(() => validateFile(file, config)).toThrow(/ファイル形式/);
  });

  it("サイズが上限を 1 バイトでも超えたらエラーを投げる", () => {
    const file = makeFile({ type: "image/jpeg", size: config.maxSize + 1 });
    expect(() => validateFile(file, config)).toThrow(/ファイルサイズ/);
  });

  it("サイズエラーには MB での上限値が含まれる", () => {
    const file = makeFile({ type: "image/jpeg", size: config.maxSize + 1 });
    expect(() => validateFile(file, config)).toThrow(/1MB/);
  });

  it("MIME タイプエラーはサイズより先に評価される", () => {
    const file = makeFile({
      type: "application/pdf",
      size: config.maxSize + 1,
    });
    expect(() => validateFile(file, config)).toThrow(/ファイル形式/);
  });
});
