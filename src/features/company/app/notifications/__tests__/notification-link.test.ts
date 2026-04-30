import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { getNotificationLink } from "@/features/company/app/notifications/components/notification-list-view";
import type { NotificationListItem } from "@/features/company/app/notifications/schemas";

function makeNotification(
  overrides: Partial<NotificationListItem>,
): NotificationListItem {
  return {
    id: "n1",
    title: "テスト通知",
    body: null,
    type: "scout_accepted",
    isRead: false,
    readAt: null,
    referenceId: "scout-123",
    referenceType: "scouts",
    createdAt: "2026-04-30T00:00:00Z",
    ...overrides,
  };
}

describe("getNotificationLink", () => {
  it("scout_accepted の場合はメッセージページへのリンクを返す", () => {
    const link = getNotificationLink(
      makeNotification({ type: "scout_accepted" }),
    );
    expect(link).toBe("/company/messages/scout-123");
  });

  it("scout_declined の場合はスカウト履歴ページへのハイライトリンクを返す", () => {
    const link = getNotificationLink(
      makeNotification({ type: "scout_declined" }),
    );
    expect(link).toBe("/company/scouts?highlight=scout-123");
  });

  it("chat_new_message の場合はメッセージページへのリンクを返す", () => {
    const link = getNotificationLink(
      makeNotification({ type: "chat_new_message" }),
    );
    expect(link).toBe("/company/messages/scout-123");
  });

  it("referenceType が scouts 以外の場合（events）はイベント編集ページへのリンクを返す", () => {
    const link = getNotificationLink(
      makeNotification({
        type: "event_reminder",
        referenceType: "events",
        referenceId: "event-456",
      }),
    );
    expect(link).toBe("/company/events/event-456/edit");
  });

  it("referenceType / referenceId が null の場合は null を返す", () => {
    expect(
      getNotificationLink(makeNotification({ referenceType: null })),
    ).toBeNull();
    expect(
      getNotificationLink(makeNotification({ referenceId: null })),
    ).toBeNull();
  });
});
