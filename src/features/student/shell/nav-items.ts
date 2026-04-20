export type StudentNavKey =
  | "home"
  | "scout"
  | "messages"
  | "events"
  | "profile"
  | "settings";

type StudentNavItem = {
  key: StudentNavKey;
  label: string;
  href: string;
  icon: string;
  showOnMobile?: boolean;
};

export const STUDENT_NAV_ITEMS: StudentNavItem[] = [
  { key: "home", label: "ホーム", href: "/student", icon: "home" },
  {
    key: "scout",
    label: "スカウト",
    href: "/student/scout",
    icon: "search_insights",
  },
  {
    key: "messages",
    label: "メッセージ",
    href: "/student/messages",
    icon: "chat_bubble",
  },
  { key: "events", label: "イベント", href: "/student/events", icon: "event" },
  {
    key: "profile",
    label: "プロフィール",
    href: "/student/profile",
    icon: "person",
  },
  {
    key: "settings",
    label: "設定",
    href: "/student/settings",
    icon: "settings",
    showOnMobile: false,
  },
];

export function resolveActiveNavKey(
  pathname: string | null,
): StudentNavKey | undefined {
  if (!pathname) return undefined;
  const match = [...STUDENT_NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
  return match?.key;
}
