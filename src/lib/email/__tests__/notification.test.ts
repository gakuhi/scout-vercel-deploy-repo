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
