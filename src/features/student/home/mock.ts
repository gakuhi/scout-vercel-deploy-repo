import type { HomeData } from "./schema";

export const MOCK_HOME_DATA: HomeData = {
  userName: "田中 太郎",
  newScoutCount: 3,
  inProgressScoutCount: 5,
  scoutAlerts: [
    {
      id: "mock-home-scout-1",
      scoutId: "mock-1",
      company: "Global Strategic Consulting",
      message: "戦略コンサルタント職への特別招待状が届いています。",
      icon: "business",
      badge: "VIP",
      timeLabel: "2時間前",
    },
    {
      id: "mock-home-scout-3",
      scoutId: "mock-2",
      company: "大手投資銀行",
      message: "夏期インターンシップ（投資銀行部門）の選考案内。",
      icon: "account_balance",
      timeLabel: "昨日",
    },
  ],
  profileCompletion: {
    percent: 65,
    missingFields: ["自己PR", "希望業界", "スキルタグ"],
  },
  unreadNotificationCount: 2,
  notifications: [
    {
      id: "mock-home-noti-1",
      kind: "system",
      icon: "campaign",
      title: "新機能：AI 自己PR 添削が利用可能になりました",
      body:
        "プロフィール画面から自己PRをAIが添削します。表現や構成のフィードバックを受けられます。",
      timeLabel: "1日前",
      unread: true,
      href: "/student/profile",
    },
    {
      id: "mock-home-noti-2",
      kind: "event",
      icon: "schedule",
      title: "イベント締切まであと2日",
      body: "「エグゼクティブ・ネットワーキング 2026」の応募締切が近づいています。",
      timeLabel: "3時間前",
      unread: true,
      href: "/student/events/event-1",
    },
    {
      id: "mock-home-noti-3",
      kind: "system",
      icon: "verified",
      title: "学生認証が完了しました",
      body: "在学証明の確認が完了し、プロフィールが企業に公開可能になりました。",
      timeLabel: "2日前",
      unread: false,
      href: null,
    },
  ],
  unreadMessageCount: 2,
  unreadMessages: [
    {
      id: "mock-home-msg-1",
      threadId: "thread-1",
      senderName: "Global Strategic Consulting",
      preview:
        "面談日程のご相談です。来週、5/12（火）以降でご都合の良い時間帯を…",
      timeLabel: "30分前",
    },
    {
      id: "mock-home-msg-2",
      threadId: "thread-2",
      senderName: "Fintech Innovators Inc. / 採用 田中",
      preview: "ポートフォリオ拝見しました。ぜひ一度カジュアル面談を…",
      timeLabel: "3時間前",
    },
  ],
  featuredEvent: {
    id: "event-1",
    title: "トップ企業10社が集結：エグゼクティブ・ネットワーキング 2026",
    category: "Conference",
    dateLabel: "2026.05.25",
    description:
      "業界をリードする企業の採用担当者と直接対話できる、完全招待制の特別イベントです。",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDh7VoLLcaRCoDIsAOqaqDZzX2I9pjpn5dNHc9aExz_0lrijUUmUK2u28sb1TsF9rMWxqcncXSA9DQllS3-w3CNhi2G1HpQQu0z4T6cDcOQfpDLsZ5_b7unzW8jXkXBwhYDtPT0JgwmbT_Px2THAiB2stlPQgQ-R5USAgryn7V-KKBIBCHMAzhybBKMNeWd01u9J0TNhdd-dbtSVoGUP9oPDMp1-BoXjFddwbVoM_p37osVbGbUlPXPu9ww7mqUqQqnNDAWU1uHC04",
    pinLabel: "締め切り間近",
    venueLabel: null,
  },
  subEvents: [
    {
      id: "event-2",
      title: "外資系投資銀行：ケーススタディ対策講座",
      category: "Seminar",
      dateLabel: "2026.05.12",
      description: "オンライン開催 | 定員50名",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAim1itH1xj9vk8zbWobIjNeh95QEFoybqcUiucqCcUIsk-VcQMXNkvcxuxK-mYusIbZ1MkuRnB3JkoYgLH3ox-IVuJenH_qcNY-SEch6IQq5UoPePcxsIPj3PfvrN-erElvxz0eBONc8P9POcUl-3J6glGlHZtOmahyTQ8weqULty0t7k93IzqkMe6rYJhvzD-o_tjBGRrCmlXkClvdhCAOX0xv3JMPKL55-zagWzfLpIzH6cSPNn9MOhIeGVmjgQfu30z0emUyH4",
      venueLabel: "オンライン開催 | 定員50名",
    },
    {
      id: "event-3",
      title: "若手起業家から学ぶ：キャリアの多様性",
      category: "Career Talk",
      dateLabel: "2026.05.18",
      description: "東京・丸の内 | ハイブリッド開催",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDAi4xR1jww3mmgQDfJtI9e4Hje_NTtStpKQUfjuuMLVeHjlZh74aKErzXpVY4d-y0inRICmOrBq53I1XyLDCGKNGyBebymXNwia2pCPN6uGt3V49w3CO5NY_cNj7KHsjkppFeeXCji_iZDNCPxIteeoII4HZno6a4CTHFZ_Ku7-rIexaC3q0asXnCfjJIUb0U36eZ0v7hipBTU7q_PuEGDpira9VeOHwzpRWGWFIZe8oTwFkHbvq8D2PQ4UzqCvBC2DitV-EaYflI",
      venueLabel: "東京・丸の内 | ハイブリッド開催",
    },
  ],
  journal: [
    {
      id: "news-1",
      dateLabel: "2026.04.10",
      title: "2027年卒：外資系・日系トップ企業の採用トレンド予測",
    },
    {
      id: "news-2",
      dateLabel: "2026.04.08",
      title: "第一線で活躍するOB・OGが語る「入社1年目のリアル」",
    },
    {
      id: "news-3",
      dateLabel: "2026.04.05",
      title: "選考を勝ち抜く：AI時代の自己PR構築術",
    },
  ],
};

/** ヒーロー背景の都市景観画像（chat-view と同じ demo URL を共有）。 */
export const HERO_BACKGROUND_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDo-vFq-41jgg0KQ59EkuYxCpNfy2FS1X0vrNAb0frGSH9ZuPWuhM6yPrr27z2TuhCaNW-LL8cR0WfEJ9OyYiz1VoRmZzwUcWeXcfoAeC6uC0OLac7p15fAIqwUCH6lEMokKMDxLgthykP2EdIjAdsXOv6vw7WNoo7PJ1C3kbsJVVz1Mb-nR0JrJ1lYHvEbtCr_tpMBHSEMQjNniTpCgSJjQddFPdaxPo1QoW257YBuSrkJBzqi6uwhUEeg6kA7C0kfXougk6NEolo";

