export type HomeScoutAlert = {
  id: string;
  /** 紐づくスカウト id。将来的に /student/scout?id=... への遷移に使う。 */
  scoutId: string;
  company: string;
  message: string;
  /** アイコン名（Material Symbols）。業界に応じて変える想定。 */
  icon: string;
  /** "VIP" や "特別招待" 等のバッジ（任意）。 */
  badge?: string | null;
  /** ハイライト表示（左ボーダー + 薄い背景）。 */
  highlighted?: boolean;
  /** 表示用の相対時刻（"2時間前" 等）。 */
  timeLabel: string;
};

export type HomeEvent = {
  id: string;
  title: string;
  /** "Conference" / "Seminar" / "Career Talk" 等のカテゴリ表示。 */
  category: string;
  dateLabel: string;
  description: string;
  imageUrl: string | null;
  /** 締め切り間近などの強調ラベル。 */
  pinLabel?: string | null;
  /** 開催地／開催形式（オンライン、ハイブリッド等）。 */
  venueLabel?: string | null;
};

export type HomeJournalArticle = {
  id: string;
  dateLabel: string;
  title: string;
  /** 外部記事の場合の遷移先 URL（指定があれば新タブで開く）。 */
  externalUrl?: string | null;
  /** 配信元の表示名（例: "ITmedia ビジネス"）。 */
  sourceLabel?: string | null;
};

export type HomeUnreadMessage = {
  id: string;
  /** 紐づくスレッド id。/student/messages?id=... 形式の遷移を想定。 */
  threadId: string;
  /** 相手側の表示名（企業名 or 担当者名）。 */
  senderName: string;
  /** スレッド内の最新メッセージのプレビュー。 */
  preview: string;
  /** 表示用の相対時刻（"30分前" 等）。 */
  timeLabel: string;
};

/** ホームのプロフィール完成度バナー。100% に達したら非表示にする想定。 */
export type HomeProfileCompletion = {
  /** 0-100 の完成度パーセンテージ。 */
  percent: number;
  /** 未入力の主要項目（最大 3-4 件、ラベル表示用）。 */
  missingFields: string[];
};

export type HomeNotificationKind = "system" | "scout" | "event" | "message";

export type HomeNotification = {
  id: string;
  kind: HomeNotificationKind;
  /** Material Symbols アイコン名。 */
  icon: string;
  title: string;
  body: string;
  timeLabel: string;
  /** 未読フラグ。true のとき強調表示。 */
  unread: boolean;
  /** 通知タップ時の遷移先（任意）。 */
  href?: string | null;
};

export type HomeData = {
  /** ログインユーザーの表示名（無ければ user.email の @ 前）。 */
  userName: string;
  scoutAlerts: HomeScoutAlert[];
  /** 新規スカウト件数（ヘッダーの「N件の新規」用）。 */
  newScoutCount: number;
  /**
   * 現在選考中のスカウト件数（accepted / 面談調整中 等）。ヒーローの
   * ステータスサマリーで表示する (PR #251 レビューFB)。
   */
  inProgressScoutCount: number;
  unreadMessages: HomeUnreadMessage[];
  /** 未読メッセージ件数（ヘッダーの「N件の未読」用）。 */
  unreadMessageCount: number;
  /** プロフィール完成度。100% のとき null（バナー非表示）。 */
  profileCompletion: HomeProfileCompletion | null;
  notifications: HomeNotification[];
  /** 未読通知件数（ヘッダーの「N件の未読」用）。 */
  unreadNotificationCount: number;
  featuredEvent: HomeEvent | null;
  subEvents: HomeEvent[];
  journal: HomeJournalArticle[];
};
