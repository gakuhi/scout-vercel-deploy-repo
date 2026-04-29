import { describe, expect, it } from "vitest";
import type { ChatMessageRow } from "../schema";
import {
  detectAttachmentKind,
  formatBytes,
  formatDateLabel,
  formatDateMd,
  formatLastMessagePreview,
  formatRelative,
  formatTime,
  isSameDay,
  isWithinDay,
  resolveAttachmentUrl,
} from "../lib/format";

describe("formatBytes", () => {
  it("1024 未満は B 単位", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("1024 以上は KB（小数点 1 桁）", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1500)).toBe("1.5 KB");
  });

  it("1MB 以上は MB", () => {
    expect(formatBytes(1_048_576)).toBe("1.0 MB");
    expect(formatBytes(2_500_000)).toBe("2.4 MB");
  });

  it("1GB 以上は GB（小数点 2 桁）", () => {
    expect(formatBytes(1_073_741_824)).toBe("1.00 GB");
    expect(formatBytes(5_000_000_000)).toBe("4.66 GB");
  });
});

describe("detectAttachmentKind", () => {
  const fileWith = (type: string) => new File([""], "x", { type });

  it("image/* なら image", () => {
    expect(detectAttachmentKind(fileWith("image/png"))).toBe("image");
    expect(detectAttachmentKind(fileWith("image/jpeg"))).toBe("image");
  });

  it("video/* なら video", () => {
    expect(detectAttachmentKind(fileWith("video/mp4"))).toBe("video");
  });

  it("それ以外は file（audio も file 扱い）", () => {
    expect(detectAttachmentKind(fileWith("application/pdf"))).toBe("file");
    expect(detectAttachmentKind(fileWith("audio/mpeg"))).toBe("file");
    expect(detectAttachmentKind(fileWith(""))).toBe("file");
  });
});

describe("formatLastMessagePreview", () => {
  const baseMsg = (
    overrides: Partial<ChatMessageRow> = {},
  ): ChatMessageRow => ({
    id: "m-1",
    conversationId: "c-1",
    senderId: "me",
    body: "",
    createdAt: "2026-04-25T10:00:00+09:00",
    readAt: null,
    attachments: [],
    ...overrides,
  });

  it("本文があれば本文を返す", () => {
    expect(formatLastMessagePreview(baseMsg({ body: "こんにちは" }))).toBe(
      "こんにちは",
    );
  });

  it("本文が空白のみで添付がある場合は添付ラベル", () => {
    const msg = baseMsg({
      body: "  ",
      attachments: [
        {
          id: "a1",
          kind: "image",
          name: "x.png",
          path: "x.png",
          mimeType: "image/png",
          sizeBytes: 100,
        },
      ],
    });
    expect(formatLastMessagePreview(msg)).toBe("[画像]");
  });

  it("複数添付なら 'ほかN件' を付ける", () => {
    const msg = baseMsg({
      attachments: [
        {
          id: "a1",
          kind: "video",
          name: "v.mp4",
          path: "v.mp4",
          mimeType: "video/mp4",
          sizeBytes: 100,
        },
        {
          id: "a2",
          kind: "image",
          name: "x.png",
          path: "x.png",
          mimeType: "image/png",
          sizeBytes: 100,
        },
      ],
    });
    expect(formatLastMessagePreview(msg)).toBe("[動画] ほか1件");
  });

  it("本文も添付も空なら空文字", () => {
    expect(formatLastMessagePreview(baseMsg())).toBe("");
  });
});

describe("resolveAttachmentUrl", () => {
  it("blob: 始まりはそのまま返す", () => {
    expect(resolveAttachmentUrl("blob:https://x/abc", {})).toBe(
      "blob:https://x/abc",
    );
  });

  it("https:// 始まりはそのまま返す", () => {
    expect(resolveAttachmentUrl("https://example.com/x.png", {})).toBe(
      "https://example.com/x.png",
    );
  });

  it("urls map にあるものは置換", () => {
    expect(
      resolveAttachmentUrl("uid/avatar.jpg", {
        "uid/avatar.jpg": "https://signed/url",
      }),
    ).toBe("https://signed/url");
  });

  it("urls map に無く blob/http でもないなら null", () => {
    expect(resolveAttachmentUrl("uid/missing.jpg", {})).toBeNull();
  });
});

describe("isWithinDay", () => {
  const now = new Date("2026-04-25T12:00:00+09:00");

  it("23 時間 59 分前は true", () => {
    expect(isWithinDay("2026-04-24T12:01:00+09:00", now)).toBe(true);
  });

  it("24 時間ちょうどは false", () => {
    expect(isWithinDay("2026-04-24T12:00:00+09:00", now)).toBe(false);
  });

  it("無効な日時は false", () => {
    expect(isWithinDay("not-a-date", now)).toBe(false);
  });
});

describe("isSameDay", () => {
  it("同じ日（時刻違い）なら true", () => {
    expect(
      isSameDay("2026-04-25T01:00:00+09:00", "2026-04-25T23:59:00+09:00"),
    ).toBe(true);
  });

  it("日跨ぎは false", () => {
    expect(
      isSameDay("2026-04-25T23:59:59+09:00", "2026-04-26T00:00:00+09:00"),
    ).toBe(false);
  });

  it("どちらかが無効日時なら false", () => {
    expect(isSameDay("not-a-date", "2026-04-25T00:00:00+09:00")).toBe(false);
  });
});

describe("formatDateLabel", () => {
  const now = new Date("2026-04-25T12:00:00+09:00");

  it("同じ日は『今日』", () => {
    expect(formatDateLabel("2026-04-25T08:00:00+09:00", now)).toBe("今日");
  });

  it("1 日前は『昨日』", () => {
    expect(formatDateLabel("2026-04-24T20:00:00+09:00", now)).toBe("昨日");
  });

  it("同年で 2 日以上前は M月D日", () => {
    expect(formatDateLabel("2026-04-10T00:00:00+09:00", now)).toMatch(
      /4月10日/,
    );
  });

  it("年跨ぎは年を含む", () => {
    expect(formatDateLabel("2025-12-31T00:00:00+09:00", now)).toMatch(/2025年/);
  });

  it("無効日時は空文字", () => {
    expect(formatDateLabel("invalid", now)).toBe("");
  });
});

describe("formatTime", () => {
  it("HH:MM 形式", () => {
    expect(formatTime("2026-04-25T08:05:30+09:00")).toMatch(/^\d{2}:\d{2}$/);
  });

  it("無効日時は空文字", () => {
    expect(formatTime("invalid")).toBe("");
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-04-25T12:00:00+09:00");

  it("1 分未満は『たった今』", () => {
    expect(formatRelative("2026-04-25T11:59:30+09:00", now)).toBe("たった今");
  });

  it("60 分未満は『N分前』", () => {
    expect(formatRelative("2026-04-25T11:30:00+09:00", now)).toBe("30分前");
  });

  it("1 時間以上は時刻表示 (HH:MM)", () => {
    expect(formatRelative("2026-04-25T08:00:00+09:00", now)).toMatch(
      /^\d{2}:\d{2}$/,
    );
  });

  it("1〜2 日前は『昨日』", () => {
    expect(formatRelative("2026-04-24T08:00:00+09:00", now)).toBe("昨日");
  });

  it("2〜7 日前は『N日前』", () => {
    expect(formatRelative("2026-04-22T12:00:00+09:00", now)).toBe("3日前");
  });

  it("7 日以上前は M月D日", () => {
    expect(formatRelative("2026-04-15T12:00:00+09:00", now)).toMatch(
      /4月15日/,
    );
  });

  it("無効日時は空文字", () => {
    expect(formatRelative("invalid", now)).toBe("");
  });
});

describe("formatDateMd", () => {
  it("M/D(曜) 形式", () => {
    // 2026-04-25 は土曜日
    expect(formatDateMd("2026-04-25")).toBe("4/25(土)");
  });

  it("月初", () => {
    expect(formatDateMd("2026-01-01")).toMatch(/^1\/1\(.\)$/);
  });

  it("無効日時は入力をそのまま返す", () => {
    expect(formatDateMd("not-a-date")).toBe("not-a-date");
  });
});
