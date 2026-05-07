import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScoutItem } from "@/features/scout/schema";
import type { ChatConversation } from "@/features/student/chat/schema";
import type { EventItem } from "@/features/student/events/schema";
import type { NotificationItem } from "@/features/student/settings/actions";

const getScoutInboxMock = vi.fn();
const getConversationsMock = vi.fn();
const listPublishedEventsMock = vi.fn();
const getNotificationsMock = vi.fn();

vi.mock("@/features/scout/actions", () => ({
  getScoutInbox: (...args: unknown[]) => getScoutInboxMock(...args),
}));
vi.mock("@/features/student/chat/actions", () => ({
  getConversations: (...args: unknown[]) => getConversationsMock(...args),
}));
vi.mock("@/features/student/events/lib/queries", () => ({
  listPublishedEvents: (...args: unknown[]) => listPublishedEventsMock(...args),
}));
vi.mock("@/features/student/settings/actions", () => ({
  getNotifications: (...args: unknown[]) => getNotificationsMock(...args),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({})),
}));

function scoutItem(overrides: Partial<ScoutItem> = {}): ScoutItem {
  return {
    id: "scout-1",
    subject: "招待",
    message: "ご招待します",
    sentAt: "2026-04-30T00:00:00Z",
    expiresAt: null,
    status: "new",
    isFavorite: false,
    senderName: null,
    company: {
      name: "Acme",
      logoUrl: null,
      industry: null,
      description: null,
      culture: null,
      employeeCountRange: null,
      websiteUrl: null,
    },
    job: {
      title: "Engineer",
      description: null,
      requirements: null,
      benefits: null,
    } as unknown as ScoutItem["job"],
    ...overrides,
  };
}

function conversation(overrides: Partial<ChatConversation> = {}): ChatConversation {
  return {
    id: "conv-1",
    scoutId: "scout-1",
    company: { id: "c-1", name: "Acme", avatarUrl: null },
    lastMessage: { body: "こんにちは", at: "2026-04-30T00:00:00Z" },
    startedAt: "2026-04-30T00:00:00Z",
    unreadCount: 0,
    online: false,
    detail: {} as ChatConversation["detail"],
    scoutSummary: {
      subject: "テストスカウト",
      message: "テストメッセージ",
      sentAt: "2026-04-30T00:00:00Z",
      jobTitle: null,
    },
    ...overrides,
  };
}

function eventItem(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: "ev-1",
    title: "Conference",
    dateLabel: "2026.05.20",
    locationLabel: "Online",
    locationKind: "online",
    badge: "online",
    imageUrl: "https://example.com/img.jpg",
    category: "career_event" as EventItem["category"],
    jobTypes: [],
    capacity: null,
    featured: false,
    targetGraduationYear: null,
    ...overrides,
  } as EventItem;
}

function notification(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: "n-1",
    type: "scout_received" as NotificationItem["type"],
    category: "scout",
    title: "新規スカウト",
    body: "本文",
    isRead: false,
    createdAt: "2026-04-30T00:00:00Z",
    ...overrides,
  };
}

describe("getHomeData", () => {
  beforeEach(() => {
    getScoutInboxMock.mockReset();
    getConversationsMock.mockReset();
    listPublishedEventsMock.mockReset();
    getNotificationsMock.mockReset();
    // formatRelative の出力を安定させるため固定時刻に。
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("status から in-progress / unread スカウト件数を計上する", async () => {
    getScoutInboxMock.mockResolvedValue([
      scoutItem({ id: "s-new-1", status: "new" }),
      scoutItem({ id: "s-new-2", status: "new" }),
      scoutItem({ id: "s-acc-1", status: "accepted" }),
      scoutItem({ id: "s-read-1", status: "read" }),
    ]);
    getConversationsMock.mockResolvedValue([]);
    listPublishedEventsMock.mockResolvedValue([]);
    getNotificationsMock.mockResolvedValue([]);

    const { getHomeData } = await import("../queries");
    const result = await getHomeData();

    expect(result.unreadScoutCount).toBe(2);
    expect(result.inProgressScoutCount).toBe(1);
    expect(result.scoutAlerts).toHaveLength(3); // HOME_LIST_LIMIT = 3
  });

  it("会話の unreadCount を合算し、未読 0 件は除外する", async () => {
    getScoutInboxMock.mockResolvedValue([]);
    getConversationsMock.mockResolvedValue([
      conversation({ id: "c-1", unreadCount: 2 }),
      conversation({ id: "c-2", unreadCount: 0 }),
      conversation({ id: "c-3", unreadCount: 5 }),
    ]);
    listPublishedEventsMock.mockResolvedValue([]);
    getNotificationsMock.mockResolvedValue([]);

    const { getHomeData } = await import("../queries");
    const result = await getHomeData();

    expect(result.unreadMessageCount).toBe(7);
    expect(result.unreadMessages.map((m) => m.id)).toEqual(["c-1", "c-3"]);
  });

  it("featured フラグがあるイベントを最優先、無ければ先頭を featured にする", async () => {
    getScoutInboxMock.mockResolvedValue([]);
    getConversationsMock.mockResolvedValue([]);
    listPublishedEventsMock.mockResolvedValue([
      eventItem({ id: "ev-a" }),
      eventItem({ id: "ev-b", featured: true }),
      eventItem({ id: "ev-c" }),
      eventItem({ id: "ev-d" }),
    ]);
    getNotificationsMock.mockResolvedValue([]);

    const { getHomeData } = await import("../queries");
    const result = await getHomeData();

    expect(result.featuredEvent?.id).toBe("ev-b");
    expect(result.subEvents.map((e) => e.id)).toEqual(["ev-a", "ev-c"]);
    expect(result.featuredEvent?.pinLabel).toBe("おすすめ");
  });

  it("featured フラグなしなら先頭を featured に、subEvents は最大 2 件", async () => {
    getScoutInboxMock.mockResolvedValue([]);
    getConversationsMock.mockResolvedValue([]);
    listPublishedEventsMock.mockResolvedValue([
      eventItem({ id: "ev-a" }),
      eventItem({ id: "ev-b" }),
      eventItem({ id: "ev-c" }),
      eventItem({ id: "ev-d" }),
    ]);
    getNotificationsMock.mockResolvedValue([]);

    const { getHomeData } = await import("../queries");
    const result = await getHomeData();

    expect(result.featuredEvent?.id).toBe("ev-a");
    expect(result.subEvents).toHaveLength(2);
    expect(result.featuredEvent?.pinLabel).toBeNull();
  });

  it("通知の category から icon / kind / href が決まる", async () => {
    getScoutInboxMock.mockResolvedValue([]);
    getConversationsMock.mockResolvedValue([]);
    listPublishedEventsMock.mockResolvedValue([]);
    getNotificationsMock.mockResolvedValue([
      notification({ id: "n-scout", category: "scout", isRead: false }),
      notification({ id: "n-msg", category: "message", isRead: true }),
      notification({
        id: "n-anno",
        category: "announcement",
        isRead: false,
        body: null,
      }),
    ]);

    const { getHomeData } = await import("../queries");
    const result = await getHomeData();

    expect(result.unreadNotificationCount).toBe(2);
    const byId = Object.fromEntries(
      result.notifications.map((n) => [n.id, n]),
    );
    expect(byId["n-scout"].icon).toBe("mail");
    expect(byId["n-scout"].href).toBe("/student/scout");
    expect(byId["n-scout"].kind).toBe("scout");
    expect(byId["n-msg"].href).toBe("/student/messages");
    expect(byId["n-anno"].kind).toBe("system"); // announcement → system
    expect(byId["n-anno"].href).toBeNull();
    expect(byId["n-anno"].body).toBe(""); // null body は空文字
  });

  it("業界文字列から scout アイコンを推定する", async () => {
    getScoutInboxMock.mockResolvedValue([
      scoutItem({
        id: "s-1",
        company: { ...scoutItem().company, industry: "戦略コンサル" },
      }),
      scoutItem({
        id: "s-2",
        company: { ...scoutItem().company, industry: "投資銀行" },
      }),
      scoutItem({
        id: "s-3",
        company: { ...scoutItem().company, industry: "Tech / Software" },
      }),
      scoutItem({
        id: "s-4",
        company: { ...scoutItem().company, industry: null },
      }),
    ]);
    getConversationsMock.mockResolvedValue([]);
    listPublishedEventsMock.mockResolvedValue([]);
    getNotificationsMock.mockResolvedValue([]);

    const { getHomeData } = await import("../queries");
    const result = await getHomeData();

    // HOME_LIST_LIMIT = 3 で先頭 3 件のみ
    const icons = result.scoutAlerts.map((a) => a.icon);
    expect(icons[0]).toBe("business");
    expect(icons[1]).toBe("account_balance");
    expect(icons[2]).toBe("rocket_launch");
  });

  it("どのソースが失敗しても他のセクションは返る", async () => {
    getScoutInboxMock.mockRejectedValue(new Error("scout down"));
    getConversationsMock.mockResolvedValue([
      conversation({ id: "c-1", unreadCount: 1 }),
    ]);
    listPublishedEventsMock.mockRejectedValue(new Error("events down"));
    getNotificationsMock.mockResolvedValue([
      notification({ id: "n-1", category: "scout" }),
    ]);

    const { getHomeData } = await import("../queries");
    const result = await getHomeData();

    expect(result.scoutAlerts).toEqual([]);
    expect(result.inProgressScoutCount).toBe(0);
    expect(result.unreadMessageCount).toBe(1);
    expect(result.featuredEvent).toBeNull();
    expect(result.subEvents).toEqual([]);
    expect(result.notifications).toHaveLength(1);
  });

  it("isFavorite な scout に ★ バッジが付く", async () => {
    getScoutInboxMock.mockResolvedValue([
      scoutItem({ id: "s-fav", isFavorite: true }),
      scoutItem({ id: "s-norm", isFavorite: false }),
    ]);
    getConversationsMock.mockResolvedValue([]);
    listPublishedEventsMock.mockResolvedValue([]);
    getNotificationsMock.mockResolvedValue([]);

    const { getHomeData } = await import("../queries");
    const result = await getHomeData();

    expect(result.scoutAlerts[0].badge).toBe("★");
    expect(result.scoutAlerts[1].badge).toBeNull();
  });
});
