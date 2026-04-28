import type { NotificationItem } from "./actions";
import type { NotificationSettings } from "./schema";

export const MOCK_NOTIFICATION_SETTINGS: NotificationSettings = {
  scout_received: true,
  chat_message: true,
  event_reminder: true,
  system_announcement: false,
};

const minutesAgo = (min: number) =>
  new Date(Date.now() - min * 60_000).toISOString();
const hoursAgo = (h: number) => minutesAgo(h * 60);
const daysAgo = (d: number) => hoursAgo(d * 24);

/**
 * 画面確認用のモック通知。全カテゴリ × 未読/既読 × 各種相対時刻を網羅。
 * `?mock=1` クエリで差し込まれる。
 */
export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "mock-1",
    type: "scout_received",
    category: "scout",
    title: "グローバルコンサルティング株式会社",
    body: "あなたに「プラチナスカウト」が届いています。特別選考ルートでのご案内です。詳細をご確認ください。",
    isRead: false,
    createdAt: minutesAgo(0),
  },
  {
    id: "mock-2",
    type: "chat_new_message",
    category: "message",
    title: "採用担当者：田中様",
    body: "昨日は面談のお時間をいただきありがとうございました。次回選考についてご連絡いたします。",
    isRead: false,
    createdAt: minutesAgo(15),
  },
  {
    id: "mock-3",
    type: "scout_accepted",
    category: "scout",
    title: "スカウトが承諾されました",
    body: "株式会社テックパートナーズがあなたのスカウト応諾を受付けました。次のステップに進みましょう。",
    isRead: false,
    createdAt: hoursAgo(2),
  },
  {
    id: "mock-4",
    type: "event_reminder",
    category: "event",
    title: "【リマインド】外資系企業内定者座談会",
    body: "本日 18:00 より開催されます。Zoom の URL をご確認ください。",
    isRead: false,
    createdAt: hoursAgo(6),
  },
  {
    id: "mock-5",
    type: "system_announcement",
    category: "announcement",
    title: "プライバシーポリシー改定のお知らせ",
    body: "2026 年 5 月 1 日付で利用規約およびプライバシーポリシーを改定いたします。",
    isRead: false,
    createdAt: daysAgo(1),
  },
  {
    id: "mock-6",
    type: "scout_received",
    category: "scout",
    title: "メガベンチャー株式会社",
    body: "あなたのスキルセットに興味を持った採用担当者からメッセージが届いています。",
    isRead: false,
    createdAt: daysAgo(1),
  },
  {
    id: "mock-7",
    type: "chat_new_message",
    category: "message",
    title: "採用担当者：山田様",
    body: "ポートフォリオを拝見しました。ぜひ一度オンライン面談でお話しさせてください。",
    isRead: true,
    createdAt: daysAgo(2),
  },
  {
    id: "mock-8",
    type: "event_reminder",
    category: "event",
    title: "キャリアセミナー「コンサル業界徹底解説」",
    body: "週末開催のイベントにご招待しています。参加確定のため本日中にお申込みください。",
    isRead: true,
    createdAt: daysAgo(3),
  },
  {
    id: "mock-9",
    type: "scout_declined",
    category: "scout",
    title: "スカウトが辞退されました",
    body: "先日お送りしたスカウトについて、候補者より辞退のご連絡をいただきました。",
    isRead: true,
    createdAt: daysAgo(4),
  },
  {
    id: "mock-10",
    type: "system_announcement",
    category: "announcement",
    title: "システムメンテナンス完了のお知らせ",
    body: "先週末のシステムメンテナンスが完了いたしました。ご協力ありがとうございました。",
    isRead: true,
    createdAt: daysAgo(5),
  },
  {
    id: "mock-11",
    type: "scout_received",
    category: "scout",
    title: "大手総合商社 A 社",
    body: "あなたに特別選考のご案内があります。書類選考免除の枠をご用意しています。",
    isRead: true,
    createdAt: daysAgo(7),
  },
  {
    id: "mock-12",
    type: "chat_new_message",
    category: "message",
    title: "採用担当者：佐々木様",
    body: "社内エンジニアとのランチ MTG の日程調整をお願いいたします。",
    isRead: true,
    createdAt: daysAgo(9),
  },
  {
    id: "mock-13",
    type: "event_reminder",
    category: "event",
    title: "Stately Scout プレミアムイベント",
    body: "選抜された学生限定のシークレットミートアップへの招待状が届いています。",
    isRead: true,
    createdAt: daysAgo(12),
  },
  {
    id: "mock-14",
    type: "system_announcement",
    category: "announcement",
    title: "新機能リリースのお知らせ",
    body: "通知センターがリニューアルされました。フィルター機能で見たい通知だけを素早く確認できます。",
    isRead: true,
    createdAt: daysAgo(18),
  },
  {
    id: "mock-15",
    type: "scout_received",
    category: "scout",
    title: "スタートアップ B 社",
    body: "シード期のスタートアップから創業メンバー募集のスカウトが届いています。",
    isRead: true,
    createdAt: daysAgo(30),
  },
];
