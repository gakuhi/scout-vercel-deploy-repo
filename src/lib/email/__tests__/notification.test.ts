import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

vi.mock("@/lib/resend/client", () => ({
  getResend: () => ({
    emails: { send: (...args: unknown[]) => sendMock(...args) },
  }),
}));

describe("sendNotificationEmail", () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: "email-id" }, error: null });
    vi.stubEnv("EMAIL_FROM", "ScoutLink <noreply@scoutlink.example>");
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://scout.example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("成功時に true を返し Resend.emails.send が呼ばれる", async () => {
    const { sendNotificationEmail } = await import("../notification");
    const ok = await sendNotificationEmail({
      to: "cm@example.com",
      type: "scout_accepted",
      title: "スカウトが承諾されました",
      body: "○○さんが承諾しました",
    });

    expect(ok).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const arg = sendMock.mock.calls[0][0];
    expect(arg).toMatchObject({
      from: "ScoutLink <noreply@scoutlink.example>",
      to: "cm@example.com",
    });
    expect(arg.subject).toBe("【スカウト承諾】スカウトが承諾されました");
    expect(arg.html).toContain("スカウトが承諾されました");
    expect(arg.html).toContain("○○さんが承諾しました");
  });

  it("subject の CR/LF はメールヘッダーインジェクション対策で空白に置換される", async () => {
    const { sendNotificationEmail } = await import("../notification");
    await sendNotificationEmail({
      to: "cm@example.com",
      type: "chat_new_message",
      title: "evil\r\nBcc: attacker@example.com",
    });

    const arg = sendMock.mock.calls[0][0];
    expect(arg.subject).not.toMatch(/[\r\n]/);
    expect(arg.subject).toContain("evil");
    expect(arg.subject).toContain("Bcc: attacker@example.com");
  });

  it("HTML 本文の特殊文字は XSS 対策でエスケープされる", async () => {
    const { sendNotificationEmail } = await import("../notification");
    await sendNotificationEmail({
      to: "cm@example.com",
      type: "system_announcement",
      title: "<script>alert(1)</script>",
      body: '"<img>"',
    });

    const arg = sendMock.mock.calls[0][0];
    expect(arg.html).not.toContain("<script>alert(1)</script>");
    expect(arg.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(arg.html).toContain("&quot;&lt;img&gt;&quot;");
  });

  it("EMAIL_FROM 未設定時は onboarding@resend.dev フォールバック", async () => {
    vi.unstubAllEnvs();
    const { sendNotificationEmail } = await import("../notification");
    await sendNotificationEmail({
      to: "cm@example.com",
      type: "scout_accepted",
      title: "hi",
    });

    const arg = sendMock.mock.calls[0][0];
    expect(arg.from).toContain("onboarding@resend.dev");
  });

  it("Resend が error を返した場合は false を返す（throw しない）", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "rate limited" },
    });
    const consoleErr = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { sendNotificationEmail } = await import("../notification");
    const ok = await sendNotificationEmail({
      to: "cm@example.com",
      type: "scout_accepted",
      title: "hi",
    });

    expect(ok).toBe(false);
    expect(consoleErr).toHaveBeenCalled();
  });

  it("actionUrl 指定時は CTA ボタン（href + ラベル）が HTML に含まれる", async () => {
    const { sendNotificationEmail } = await import("../notification");
    await sendNotificationEmail({
      to: "cm@example.com",
      type: "scout_accepted",
      title: "スカウトが承諾されました",
      actionUrl: "https://scout.example.com/company/scouts?highlight=scout-1",
    });

    const arg = sendMock.mock.calls[0][0];
    expect(arg.html).toContain(
      "https://scout.example.com/company/scouts?highlight=scout-1",
    );
    // 種別 = scout_accepted の CTA ラベル
    expect(arg.html).toContain("詳細を見る");
  });

  it("actionUrl 未指定時は CTA ボタンを描画しない", async () => {
    const { sendNotificationEmail } = await import("../notification");
    await sendNotificationEmail({
      to: "cm@example.com",
      type: "system_announcement",
      title: "メンテナンスのお知らせ",
    });

    const arg = sendMock.mock.calls[0][0];
    // CTA 用の <a> ボタンの目印（border-radius: 999px）は含まれない
    expect(arg.html).not.toContain("border-radius: 999px");
  });

  it("actionUrl が javascript: スキームの場合は href を '#' に落とす（XSS 防御）", async () => {
    const { sendNotificationEmail } = await import("../notification");
    await sendNotificationEmail({
      to: "cm@example.com",
      type: "scout_accepted",
      title: "evil",
      actionUrl: "javascript:alert(1)",
    });

    const arg = sendMock.mock.calls[0][0];
    expect(arg.html).not.toContain("javascript:alert");
    expect(arg.html).toContain('href="#"');
  });

  it("ヘッダーに ScoutLink ロゴ（/logos/black.png）の絶対 URL が含まれる", async () => {
    const { sendNotificationEmail } = await import("../notification");
    await sendNotificationEmail({
      to: "cm@example.com",
      type: "scout_accepted",
      title: "hi",
    });

    const arg = sendMock.mock.calls[0][0];
    expect(arg.html).toContain(
      'src="https://scout.example.com/logos/black.png"',
    );
    expect(arg.html).toContain('alt="ScoutLink"');
  });

  it("NEXT_PUBLIC_BASE_URL 未設定時はロゴ帯を描画しない（壊れた画像を出さない）", async () => {
    vi.unstubAllEnvs();
    const { sendNotificationEmail } = await import("../notification");
    await sendNotificationEmail({
      to: "cm@example.com",
      type: "scout_accepted",
      title: "hi",
    });

    const arg = sendMock.mock.calls[0][0];
    expect(arg.html).not.toContain("/logos/black.png");
    expect(arg.html).not.toContain('alt="ScoutLink"');
  });

  it("フッターに通知設定ページへのリンクが含まれる", async () => {
    const { sendNotificationEmail } = await import("../notification");
    await sendNotificationEmail({
      to: "cm@example.com",
      type: "scout_accepted",
      title: "hi",
    });

    const arg = sendMock.mock.calls[0][0];
    expect(arg.html).toContain(
      "https://scout.example.com/company/notifications/settings",
    );
    expect(arg.html).toContain("通知設定ページ");
  });

  it("全種別で共通のブランドアクセントカラーを使う（種別ごとの色分けは行わない方針）", async () => {
    const { sendNotificationEmail } = await import("../notification");

    await sendNotificationEmail({
      to: "cm@example.com",
      type: "scout_accepted",
      title: "hi",
    });
    const accepted = sendMock.mock.calls[0][0].html as string;

    sendMock.mockClear();
    await sendNotificationEmail({
      to: "cm@example.com",
      type: "scout_declined",
      title: "hi",
    });
    const declined = sendMock.mock.calls[0][0].html as string;

    // 種別が違っても色は同じ（ヘッダー帯の background-color 部分を抜いて比較）
    const extractAccent = (html: string) =>
      /background-color:\s*(#[0-9A-Fa-f]{6})/.exec(html)?.[1] ?? null;
    expect(extractAccent(accepted)).not.toBeNull();
    expect(extractAccent(accepted)).toBe(extractAccent(declined));
  });

  // モジュール差し替えを伴うため、副作用が後続テストに残らないよう最後に置く。
  it("getResend が throw（API キー未設定など）した場合は false を返す", async () => {
    vi.resetModules();
    vi.doMock("@/lib/resend/client", () => ({
      getResend: () => {
        throw new Error("RESEND_API_KEY が設定されていません");
      },
    }));
    const consoleErr = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { sendNotificationEmail } = await import("../notification");
    const ok = await sendNotificationEmail({
      to: "cm@example.com",
      type: "scout_accepted",
      title: "hi",
    });

    expect(ok).toBe(false);
    expect(consoleErr).toHaveBeenCalled();
    vi.doUnmock("@/lib/resend/client");
  });
});
