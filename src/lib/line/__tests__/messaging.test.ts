import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("lib/line/messaging", () => {
  beforeEach(() => {
    vi.stubEnv(
      "LINE_MESSAGING_CHANNEL_ACCESS_TOKEN",
      "test-channel-access-token",
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("buildTextMessage", () => {
    it("通常のテキストをそのまま type=text で返す", async () => {
      const { buildTextMessage } = await import("../messaging");
      expect(buildTextMessage("こんにちは")).toEqual({
        type: "text",
        text: "こんにちは",
      });
    });

    it("上限（4900 文字）を超えるテキストは末尾を … に置き換える", async () => {
      const { buildTextMessage } = await import("../messaging");
      const long = "a".repeat(5000);
      const m = buildTextMessage(long);
      expect(m.type).toBe("text");
      expect(m.text.length).toBe(4900);
      expect(m.text.endsWith("…")).toBe(true);
    });
  });

  describe("pushLineMessage", () => {
    it("push エンドポイントに正しいヘッダと body で POST する", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: true, status: 200 } as Response);
      global.fetch = fetchMock as unknown as typeof fetch;

      const { pushLineMessage, buildTextMessage } = await import(
        "../messaging"
      );
      await pushLineMessage("U1234", [buildTextMessage("hi")]);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api.line.me/v2/bot/message/push");
      expect(init.method).toBe("POST");
      expect(init.headers["Content-Type"]).toBe("application/json");
      expect(init.headers.Authorization).toBe(
        "Bearer test-channel-access-token",
      );
      expect(JSON.parse(init.body)).toEqual({
        to: "U1234",
        messages: [{ type: "text", text: "hi" }],
      });
    });

    it("レスポンスが ok でない場合はエラーを投げる", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: () => Promise.resolve("{\"message\":\"invalid\"}"),
      } as unknown as Response) as unknown as typeof fetch;

      const { pushLineMessage, buildTextMessage } = await import(
        "../messaging"
      );
      await expect(
        pushLineMessage("U1234", [buildTextMessage("hi")]),
      ).rejects.toThrow(/LINE push failed: 400/);
    });

    it("messages が空の場合エラーを投げる", async () => {
      const { pushLineMessage } = await import("../messaging");
      await expect(pushLineMessage("U1234", [])).rejects.toThrow(
        /messages が空/,
      );
    });

    it("messages が 5 件を超える場合エラーを投げる", async () => {
      const { pushLineMessage, buildTextMessage } = await import(
        "../messaging"
      );
      const msgs = Array.from({ length: 6 }, () => buildTextMessage("x"));
      await expect(pushLineMessage("U1234", msgs)).rejects.toThrow(
        /最大 5 件/,
      );
    });

    it("LINE_MESSAGING_CHANNEL_ACCESS_TOKEN 未設定でエラー", async () => {
      vi.unstubAllEnvs();
      const { pushLineMessage, buildTextMessage } = await import(
        "../messaging"
      );
      await expect(
        pushLineMessage("U1234", [buildTextMessage("hi")]),
      ).rejects.toThrow(/LINE_MESSAGING_CHANNEL_ACCESS_TOKEN/);
    });
  });
});
