import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildActionUrl } from "../build-action-url";

describe("features/notification/lib/build-action-url", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://scout.example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("NEXT_PUBLIC_BASE_URL 未設定時は null を返す", () => {
    vi.unstubAllEnvs();
    expect(
      buildActionUrl({ recipientRole: "student", type: "scout_received" }),
    ).toBeNull();
  });

  it("BASE_URL の末尾スラッシュを除去して連結する", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://scout.example.com///");
    expect(
      buildActionUrl({ recipientRole: "student", type: "scout_received" }),
    ).toBe("https://scout.example.com/student/scout");
  });

  describe("学生", () => {
    it("scout_received → /student/scout", () => {
      expect(
        buildActionUrl({
          recipientRole: "student",
          type: "scout_received",
          referenceType: "scouts",
          referenceId: "scout-1",
        }),
      ).toBe("https://scout.example.com/student/scout");
    });

    it("chat_new_message → /student/messages（一覧）", () => {
      expect(
        buildActionUrl({
          recipientRole: "student",
          type: "chat_new_message",
          referenceType: "scouts",
          referenceId: "scout-1",
        }),
      ).toBe("https://scout.example.com/student/messages");
    });

    it("event_reminder → /student/events/{id}", () => {
      expect(
        buildActionUrl({
          recipientRole: "student",
          type: "event_reminder",
          referenceType: "events",
          referenceId: "event-1",
        }),
      ).toBe("https://scout.example.com/student/events/event-1");
    });

    it("event_reminder で referenceId 欠落 → ダッシュボードにフォールバック", () => {
      expect(
        buildActionUrl({
          recipientRole: "student",
          type: "event_reminder",
        }),
      ).toBe("https://scout.example.com/student/dashboard");
    });

    it("system_announcement → /student/dashboard", () => {
      expect(
        buildActionUrl({
          recipientRole: "student",
          type: "system_announcement",
        }),
      ).toBe("https://scout.example.com/student/dashboard");
    });

    it("学生に来ない種別（scout_accepted）は dashboard にフォールバック", () => {
      expect(
        buildActionUrl({
          recipientRole: "student",
          type: "scout_accepted",
        }),
      ).toBe("https://scout.example.com/student/dashboard");
    });
  });

  describe("企業担当者", () => {
    it("scout_accepted → /company/scouts?highlight={id}", () => {
      expect(
        buildActionUrl({
          recipientRole: "company_member",
          type: "scout_accepted",
          referenceType: "scouts",
          referenceId: "scout-1",
        }),
      ).toBe("https://scout.example.com/company/scouts?highlight=scout-1");
    });

    it("scout_declined → /company/scouts?highlight={id}", () => {
      expect(
        buildActionUrl({
          recipientRole: "company_member",
          type: "scout_declined",
          referenceType: "scouts",
          referenceId: "scout-2",
        }),
      ).toBe("https://scout.example.com/company/scouts?highlight=scout-2");
    });

    it("chat_new_message → /company/messages/{scoutId}", () => {
      expect(
        buildActionUrl({
          recipientRole: "company_member",
          type: "chat_new_message",
          referenceType: "scouts",
          referenceId: "scout-1",
        }),
      ).toBe("https://scout.example.com/company/messages/scout-1");
    });

    it("event_reminder → /company/events/{id}/edit", () => {
      expect(
        buildActionUrl({
          recipientRole: "company_member",
          type: "event_reminder",
          referenceType: "events",
          referenceId: "event-1",
        }),
      ).toBe("https://scout.example.com/company/events/event-1/edit");
    });

    it("system_announcement → /company/notifications", () => {
      expect(
        buildActionUrl({
          recipientRole: "company_member",
          type: "system_announcement",
        }),
      ).toBe("https://scout.example.com/company/notifications");
    });

    it("企業に来ない種別（scout_received）は通知一覧にフォールバック", () => {
      expect(
        buildActionUrl({
          recipientRole: "company_member",
          type: "scout_received",
        }),
      ).toBe("https://scout.example.com/company/notifications");
    });

    it("scout_accepted で referenceId 欠落 → 通知一覧にフォールバック", () => {
      expect(
        buildActionUrl({
          recipientRole: "company_member",
          type: "scout_accepted",
        }),
      ).toBe("https://scout.example.com/company/notifications");
    });
  });
});
