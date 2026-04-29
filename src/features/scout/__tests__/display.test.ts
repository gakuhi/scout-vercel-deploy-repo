import { describe, expect, it } from "vitest";
import { formatSender, toDisplayStatus } from "../lib/display";

describe("toDisplayStatus", () => {
  const now = new Date("2026-04-25T12:00:00+09:00");

  it("expires_at が現在時刻より過去なら expired を返す", () => {
    const result = toDisplayStatus(
      {
        status: "sent",
        read_at: null,
        expires_at: "2026-04-20T00:00:00+09:00",
      },
      now,
    );
    expect(result).toBe("expired");
  });

  it("expires_at が未来でも DB の status が accepted なら accepted を返す", () => {
    const result = toDisplayStatus(
      {
        status: "accepted",
        read_at: "2026-04-21T10:00:00+09:00",
        expires_at: "2026-05-01T00:00:00+09:00",
      },
      now,
    );
    expect(result).toBe("accepted");
  });

  it("status が declined ならそのまま declined", () => {
    expect(
      toDisplayStatus(
        { status: "declined", read_at: null, expires_at: null },
        now,
      ),
    ).toBe("declined");
  });

  it("DB の status が expired ならそのまま expired", () => {
    expect(
      toDisplayStatus(
        { status: "expired", read_at: null, expires_at: null },
        now,
      ),
    ).toBe("expired");
  });

  it("status が sent で read_at が null なら new", () => {
    expect(
      toDisplayStatus(
        { status: "sent", read_at: null, expires_at: null },
        now,
      ),
    ).toBe("new");
  });

  it("status が sent で read_at が設定されていれば read", () => {
    expect(
      toDisplayStatus(
        {
          status: "sent",
          read_at: "2026-04-24T10:00:00+09:00",
          expires_at: null,
        },
        now,
      ),
    ).toBe("read");
  });

  it("expires_at の判定は accepted より優先される（期限切れ優先）", () => {
    const result = toDisplayStatus(
      {
        status: "accepted",
        read_at: "2026-04-24T10:00:00+09:00",
        expires_at: "2026-04-20T00:00:00+09:00",
      },
      now,
    );
    expect(result).toBe("expired");
  });

  it("expires_at が現在時刻と同じだと expired にはならない（厳密に過去のみ）", () => {
    const sameMoment = "2026-04-25T12:00:00+09:00";
    const result = toDisplayStatus(
      {
        status: "sent",
        read_at: null,
        expires_at: sameMoment,
      },
      now,
    );
    expect(result).toBe("new");
  });

  it("now 引数を省略した場合は現在時刻が使われる", () => {
    // 過去の expires_at を渡せば必ず expired になる
    const result = toDisplayStatus({
      status: "sent",
      read_at: null,
      expires_at: "2020-01-01T00:00:00+09:00",
    });
    expect(result).toBe("expired");
  });
});

describe("formatSender", () => {
  it("member が null なら null を返す", () => {
    expect(formatSender(null)).toBeNull();
  });

  it("姓名どちらも null なら null を返す", () => {
    expect(formatSender({ last_name: null, first_name: null })).toBeNull();
  });

  it("姓のみなら姓を返す", () => {
    expect(formatSender({ last_name: "山田", first_name: null })).toBe("山田");
  });

  it("名のみなら名を返す", () => {
    expect(formatSender({ last_name: null, first_name: "太郎" })).toBe("太郎");
  });

  it("両方あれば「姓 名」で連結", () => {
    expect(formatSender({ last_name: "山田", first_name: "太郎" })).toBe(
      "山田 太郎",
    );
  });

  it("空文字は falsy として除外される", () => {
    expect(formatSender({ last_name: "", first_name: "太郎" })).toBe("太郎");
  });
});
