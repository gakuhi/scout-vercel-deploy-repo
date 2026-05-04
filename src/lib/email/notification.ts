import {
  NOTIFICATION_TYPE_LABELS,
  type NotificationType,
} from "@/features/notification/lib/types";
import { getResend } from "@/lib/resend/client";

/**
 * メールヘッダー帯と CTA ボタンに使う共通アクセントカラー。
 *
 * 種別ごとの色分けは行わない方針（プロダクト判断: 視覚的差別化はせず、種別ラベル
 * + CTA ラベル + 本文の文章で内容を伝える）。LINE Flex 側 (`render-line.ts`) の
 * `BRAND_ACCENT_COLOR` と揃える。
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

/**
 * メールフッターの設定リンク。企業担当者のみがメール受信者なので、
 * 配信停止導線は企業側の通知設定 UI に集約する想定。
 *
 * NEXT_PUBLIC_BASE_URL が無い場合は相対パスのまま埋める（クライアント側で
 * ベース URL を解決する想定だが、実害は限定的）。
 */
function buildSettingsUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") ?? "";
  return `${baseUrl}/company/notifications/settings`;
}

/**
 * メールヘッダーに表示する ScoutLink ロゴの絶対 URL。
 *
 * `public/logos/black.png` を `NEXT_PUBLIC_BASE_URL` 配下から参照する。
 * メール HTML はメールクライアント側で表示されるため絶対 URL が必須。
 *
 * `NEXT_PUBLIC_BASE_URL` が未設定 (= 設定漏れ) の場合は null を返し、
 * 呼び出し側でロゴ帯自体を描画しない動作にする（壊れた画像アイコンを出さない）。
 */
function buildLogoUrl(): string | null {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (!baseUrl) return null;
  return `${baseUrl}/logos/black.png`;
}

/**
 * 通知メールを Resend で送信する。
 *
 * 失敗時は false を返し、呼び出し側で握りつぶす想定（fail-open ポリシー）。
 * 本関数自体は throw せず、Resend SDK のエラーや `RESEND_API_KEY` 未設定も
 * console.error でログしたうえで false を返す。
 *
 * subject にはユーザー入力由来の文字列（title）が混ざるため、メールヘッダー
 * インジェクション対策として CR / LF を空白に置換する。本文（HTML）は
 * `escapeHtml()` で XSS 対策する。
 *
 * 種別ごとのヘッダー色 / CTA ラベルは LINE Flex Message 側と揃えてブランド統一。
 */
export async function sendNotificationEmail(input: {
  to: string;
  type: NotificationType;
  title: string;
  body?: string;
  actionUrl?: string | null;
}): Promise<boolean> {
  try {
    const resend = getResend();

    const typeLabel = NOTIFICATION_TYPE_LABELS[input.type];
    const safeSubject = `【${typeLabel}】${input.title}`.replace(
      /[\r\n]+/g,
      " ",
    );

    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "ScoutLink <onboarding@resend.dev>",
      to: input.to,
      subject: safeSubject,
      html: buildNotificationHtml({
        type: input.type,
        typeLabel,
        title: input.title,
        body: input.body,
        actionUrl: input.actionUrl ?? null,
      }),
    });

    if (error) {
      console.error("[email] sendNotificationEmail Resend error:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] sendNotificationEmail failed:", e);
    return false;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * URL 用エスケープ。`href` / `src` 属性に埋める前に使う。
 *
 * - `javascript:` 等のスキーム経由の XSS を防ぐため、http(s) 以外は `#` に落とす
 * - そのうえで HTML エスケープも掛ける（`"` を含む URL でアトリビュートが
 *   壊れないように）
 *
 * `actionUrl` は `buildActionUrl()` 経由で `NEXT_PUBLIC_BASE_URL` をベースに
 * 構築されるため通常は安全だが、防御的にチェックする。
 */
function safeHref(url: string): string {
  if (!/^https?:\/\//i.test(url)) return "#";
  return escapeHtml(url);
}

/**
 * 通知メールの HTML 本体を組み立てる。
 *
 * `sendNotificationEmail()` の内部からだけでなく、開発時のローカルプレビュー
 * （`tools/dump-notification-samples.ts` 等）からも参照する想定で export する。
 * 実装の差を埋めて、本番に出るのと完全に同じ HTML をプレビューできるようにする。
 */
export function buildNotificationHtml(input: {
  type: NotificationType;
  typeLabel: string;
  title: string;
  body?: string;
  actionUrl: string | null;
}): string {
  const ctaLabel = TYPE_CTA_LABEL[input.type];

  const safeTitle = escapeHtml(input.title);
  const safeTypeLabel = escapeHtml(input.typeLabel);
  const safeBody = input.body ? escapeHtml(input.body) : "";
  const safeAccent = escapeHtml(BRAND_ACCENT_COLOR);
  const safeCtaLabel = escapeHtml(ctaLabel);
  const safeSettingsUrl = safeHref(buildSettingsUrl());
  const logoUrl = buildLogoUrl();

  const ctaBlock =
    input.actionUrl != null
      ? `
    <div style="margin: 32px 0 8px; text-align: center;">
      <a href="${safeHref(input.actionUrl)}"
         style="display: inline-block; padding: 12px 32px; background-color: ${safeAccent}; color: #ffffff; text-decoration: none; border-radius: 999px; font-size: 14px; font-weight: 700;">
        ${safeCtaLabel}
      </a>
    </div>`
      : "";

  // 画像 1466×243 のワードマーク。width=180 で height ≈ 30px の署名サイズ。
  // 画像ブロックが効いている環境向けに alt="ScoutLink" を付与し、フッターの
  // テキスト "ScoutLink" でブランド名を補完する。
  const logoBlock = logoUrl
    ? `
    <div style="background: #ffffff; padding: 20px 24px; text-align: center; border-bottom: 1px solid #eceef0;">
      <img src="${safeHref(logoUrl)}" alt="ScoutLink" width="180" height="30" style="display: inline-block; max-width: 100%; height: auto; border: 0;">
    </div>`
    : "";

  return `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; background-color: #f8f9fb; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    ${logoBlock}
    <div style="background-color: ${safeAccent}; padding: 12px 24px;">
      <p style="margin: 0; font-size: 12px; color: #ffffff; font-weight: 700; letter-spacing: 0.08em;">
        ${safeTypeLabel}
      </p>
    </div>
    <div style="padding: 32px 32px 24px;">
      <h1 style="font-size: 18px; font-weight: 800; color: #001f41; margin: 0 0 16px;">
        ${safeTitle}
      </h1>
      ${safeBody ? `<p style="font-size: 14px; color: #43474f; line-height: 1.8; margin: 0;">${safeBody}</p>` : ""}
      ${ctaBlock}
    </div>
    <div style="border-top: 1px solid #eceef0; padding: 20px 32px; background-color: #fafbfc;">
      <p style="margin: 0 0 8px; font-size: 11px; color: #737780; line-height: 1.6;">
        このメールは ScoutLink から自動送信されています。<br>
        通知の受信設定は
        <a href="${safeSettingsUrl}" style="color: #5e47ea; text-decoration: underline;">通知設定ページ</a>
        から変更できます。
      </p>
      <p style="margin: 0; font-size: 11px; color: #c3c6d1; text-align: center;">
        ScoutLink
      </p>
    </div>
  </div>
</body>
</html>`.trim();
}
