import { describe, expect, it } from "vitest";

import {
  renderLineNotificationMessage,
  renderLineNotificationTextFallback,
} from "../render-line";

describe("features/notification/lib/render-line", () => {
  describe("renderLineNotificationMessage", () => {
    it("Flex Message が 1 件返り、altText に種別ラベル + タイトルが入る", () => {
      const messages = renderLineNotificationMessage({
        type: "scout_received",
        title: "新しいスカウト",
        body: "ココシロ株式会社",
        actionUrl: "https://scout.example.com/student/scout",
      });
      expect(messages).toHaveLength(1);
      const m = messages[0];
      expect(m.type).toBe("flex");
      if (m.type !== "flex") return;
      expect(m.altText).toBe("【スカウト受信】新しいスカウト");
    });

    it("body が空の場合は body テキストノードを省略", () => {
      const [m] = renderLineNotificationMessage({
        type: "scout_received",
        title: "新しいスカウト",
        actionUrl: null,
      });
      if (m.type !== "flex") throw new Error("expected flex");
      const bubble = m.contents as {
        body: { contents: Array<{ type: string }> };
      };
      // body テキストのみ（"text" ノード 1 件）。説明文ノードは無し
      expect(bubble.body.contents).toHaveLength(1);
    });

    it("actionUrl が null なら footer（CTA ボタン）を作らない", () => {
      const [m] = renderLineNotificationMessage({
        type: "system_announcement",
        title: "メンテナンスのお知らせ",
        actionUrl: null,
      });
      if (m.type !== "flex") throw new Error("expected flex");
      const bubble = m.contents as { footer?: unknown };
      expect(bubble.footer).toBeUndefined();
    });

    it("actionUrl があれば footer に uri アクション付きボタンを入れる", () => {
      const url = "https://scout.example.com/student/events/event-1";
      const [m] = renderLineNotificationMessage({
        type: "event_reminder",
        title: "イベント開催間近",
        actionUrl: url,
      });
      if (m.type !== "flex") throw new Error("expected flex");
      const bubble = m.contents as {
        footer: {
          contents: Array<{
            type: string;
            action: { type: string; label: string; uri: string };
          }>;
        };
      };
      expect(bubble.footer.contents).toHaveLength(1);
      const button = bubble.footer.contents[0];
      expect(button.type).toBe("button");
      expect(button.action.type).toBe("uri");
      expect(button.action.uri).toBe(url);
      // ラベルは種別ごとに変わる: event_reminder は "イベントを確認"
      expect(button.action.label).toBe("イベントを確認");
    });

    it("ヘッダーには種別ラベルが入る", () => {
      const [m] = renderLineNotificationMessage({
        type: "chat_new_message",
        title: "新着メッセージ",
        actionUrl: null,
      });
      if (m.type !== "flex") throw new Error("expected flex");
      const bubble = m.contents as {
        header: { contents: Array<{ type: string; text: string }> };
      };
      expect(bubble.header.contents[0].text).toBe("チャット新着");
    });

    it("title が極端に長い場合は切り詰められる（落ちない）", () => {
      const longTitle = "あ".repeat(3000);
      const [m] = renderLineNotificationMessage({
        type: "system_announcement",
        title: longTitle,
        actionUrl: null,
      });
      if (m.type !== "flex") throw new Error("expected flex");
      const bubble = m.contents as {
        body: { contents: Array<{ text: string }> };
      };
      expect(bubble.body.contents[0].text.length).toBeLessThanOrEqual(2000);
    });
  });

  describe("renderLineNotificationTextFallback", () => {
    it("種別ラベル + タイトル + 本文 + URL の順で 1 件のテキストにまとめる", () => {
      const [m] = renderLineNotificationTextFallback({
        type: "scout_received",
        title: "新しいスカウト",
        body: "ココシロ株式会社",
        actionUrl: "https://scout.example.com/student/scout",
      });
      expect(m.type).toBe("text");
      if (m.type !== "text") return;
      expect(m.text).toContain("【スカウト受信】");
      expect(m.text).toContain("新しいスカウト");
      expect(m.text).toContain("ココシロ株式会社");
      expect(m.text).toContain("https://scout.example.com/student/scout");
    });

    it("actionUrl が null の場合は URL 行を含めない", () => {
      const [m] = renderLineNotificationTextFallback({
        type: "system_announcement",
        title: "お知らせ",
        actionUrl: null,
      });
      if (m.type !== "text") throw new Error("expected text");
      expect(m.text).not.toContain("http");
    });
  });
});
