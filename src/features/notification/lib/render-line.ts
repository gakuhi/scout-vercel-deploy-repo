import {
  buildTextMessage,
  type LineMessage,
} from "@/lib/line/messaging";

import {
  NOTIFICATION_TYPE_LABELS,
  type NotificationType,
} from "./types";

/**
 * Flex Message のヘッダー帯と CTA ボタンに使う共通アクセントカラー。
 *
 * 種別ごとの色分けは行わない方針（プロダクト判断: 視覚的差別化はせず、種別ラベル
 * + CTA ラベル + 本文の文章で内容を伝える）。デザインシステム化されたタイミングで
 * 値だけ差し替える想定。`src/lib/email/notification.ts` の `BRAND_ACCENT_COLOR` と
 * 揃える。
 */
const BRAND_ACCENT_COLOR = "#001F41";

/**
 * 通知種別ごとの CTA ボタンラベル。`actionUrl` が解決できたときのみ使う。
 */
const TYPE_CTA_LABEL: Record<NotificationType, string> = {
  scout_received: "スカウトを確認",
  scout_accepted: "詳細を見る",
  scout_declined: "詳細を見る",
  chat_new_message: "メッセージを開く",
  event_reminder: "イベントを確認",
  system_announcement: "確認する",
};

const FLEX_TEXT_MAX = 2000;

function clip(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * 通知を LINE で配信する形に整形する。
 *
 * - Flex Message を 1 件返す（Bubble: ヘッダー帯 / 本文 / CTA フッター）
 * - LINE クライアントの通知 / 一覧に表示される `altText` には種別 + タイトルを使う
 * - `actionUrl` が null の場合は CTA フッターを省略する（ボタン無しの Flex は許容される）
 *
 * 注: LINE Flex Message のテキストノードは 2000 文字までなので、title / body は
 * 安全のため 1990 文字で切り詰める（`buildTextMessage` の 4900 文字とは別の上限）。
 */
export function renderLineNotificationMessage(input: {
  type: NotificationType;
  title: string;
  body?: string;
  actionUrl?: string | null;
}): LineMessage[] {
  const typeLabel = NOTIFICATION_TYPE_LABELS[input.type];
  const ctaLabel = TYPE_CTA_LABEL[input.type];

  const safeTitle = clip(input.title, FLEX_TEXT_MAX);
  const safeBody = input.body ? clip(input.body, FLEX_TEXT_MAX) : null;

  const altText = clip(`【${typeLabel}】${input.title}`, 400);

  const bodyContents: unknown[] = [
    {
      type: "text",
      text: safeTitle,
      weight: "bold",
      size: "md",
      color: "#001F41",
      wrap: true,
    },
  ];
  if (safeBody) {
    bodyContents.push({
      type: "text",
      text: safeBody,
      size: "sm",
      color: "#43474F",
      wrap: true,
      margin: "md",
    });
  }

  const bubble: Record<string, unknown> = {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: BRAND_ACCENT_COLOR,
      paddingAll: "md",
      contents: [
        {
          type: "text",
          text: typeLabel,
          color: "#FFFFFF",
          weight: "bold",
          size: "sm",
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: bodyContents,
    },
  };

  if (input.actionUrl) {
    bubble.footer = {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: BRAND_ACCENT_COLOR,
          height: "sm",
          action: {
            type: "uri",
            label: ctaLabel,
            uri: input.actionUrl,
          },
        },
      ],
    };
  }

  return [
    {
      type: "flex",
      altText,
      contents: bubble,
    },
  ];
}

/**
 * Flex Message が使えない（または fallback したい）状況のためのテキスト整形。
 * 現在 notify() は Flex 経路を使うが、後続のリトライキュー実装などでテキスト
 * fallback が必要になった場合の単一窓口として残す。
 */
export function renderLineNotificationTextFallback(input: {
  type: NotificationType;
  title: string;
  body?: string;
  actionUrl?: string | null;
}): LineMessage[] {
  const typeLabel = NOTIFICATION_TYPE_LABELS[input.type];
  const lines: string[] = [`【${typeLabel}】`, input.title];
  if (input.body) lines.push("", input.body);
  if (input.actionUrl) lines.push("", input.actionUrl);
  return [buildTextMessage(lines.join("\n"))];
}
