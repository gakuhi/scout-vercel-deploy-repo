import type { ApplyDefaults } from "./components/apply-dialog";
import type { EventDetail, EventItem, EventsHero } from "./schema";

/**
 * `?mock=1` 時に申込ダイアログへ流すダミーのプロフィール値。
 * isApplyProfileComplete を満たすことで ApplyButton が CTA ではなく
 * 通常の「申し込む」ボタンを出す。
 */
export const MOCK_APPLY_DEFAULTS: ApplyDefaults = {
  name: "山田 太郎",
  email: "yamada@example.com",
  affiliation: "東京大学 工学部 機械工学科",
};

/**
 * 学生イベント画面のヒーロー（固定表示）。events 自体は DB から取得するため、
 * このファイルで保持するのはレイアウト固定値だけ。
 */
export const EVENTS_HERO: EventsHero = {
  eyebrow: "特別招待枠",
  title: "プロフェッショナルのための\n厳選イベント",
  imageUrl:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBtj4XXqN4Nkr7nKk6LVZ-wdZEmZESyysEsAEdB23J-1JnC2VJ4k2pf6DkscKm8itsasnT9SH4ePmZPnrdhD_hcfvQHMSvvl-ZLfvGTcACdVDyQxD8in9uTwj4VbMxymN0J93JpSxbzCOHFQoPie8BRUU_X46O1qUENr0aKB0vI8zOFilt4NEGO-nkLwfMJmrkfO_F1ZNULjpJQkvXJ0JrWSHk50EQ3OTQPG6nQ507yq6CDHXdkXj6iQ296FJ8P_hFQCcSI0oxWRY8",
};

// 画像はすべて picsum.photos の実 URL で読み込み可能。Google Maps 埋め込み URL は
// `&output=embed` のレガシー形式（API キー不要）。今日は 2026-04-25 想定。

export const MOCK_EVENT_ITEMS: EventItem[] = [
  {
    id: "evt-1",
    title: "ゴールドマン・サックス サマーインターン説明会",
    dateLabel: "2026.05.20",
    locationLabel: "東京都千代田区 / オンライン (Hybrid)",
    locationKind: "hybrid",
    badge: "exclusive",
    imageUrl: "https://picsum.photos/seed/evt-gs-summer/800/500",
    category: "会社説明会",
    jobTypes: ["エンジニア", "金融"],
    capacity: 200,
    remainingCapacity: 45,
    applicationDeadline: "2026-05-15",
    targetGraduationYear: 2027,
    featured: true,
  },
  {
    id: "evt-2",
    title: "合同企業説明会 トップティア 8 社",
    dateLabel: "2026.05.28",
    locationLabel: "東京・グランドハイアット",
    locationKind: "offline",
    badge: "offline",
    imageUrl: "https://picsum.photos/seed/evt-joint-toptier/800/500",
    category: "合同企業説明会",
    jobTypes: [],
    capacity: 500,
    remainingCapacity: 280,
    applicationDeadline: "2026-05-26",
    targetGraduationYear: null,
  },
  {
    id: "evt-3",
    title: "メルカリ 2 週間サマーインターンシップ",
    dateLabel: "2026.08.04 - 08.15",
    locationLabel: "東京都港区 / オンライン併用 (Hybrid)",
    locationKind: "hybrid",
    badge: "exclusive",
    imageUrl: "https://picsum.photos/seed/evt-mercari-intern/800/500",
    category: "インターンシップ",
    jobTypes: ["エンジニア", "デザイナー", "ビジネス"],
    capacity: 30,
    remainingCapacity: 6,
    applicationDeadline: "2026-05-30",
    targetGraduationYear: 2027,
    featured: true,
  },
  {
    id: "evt-4",
    title: "外資系投資銀行 ケース面接対策セミナー",
    dateLabel: "2026.05.10",
    locationLabel: "オンライン (Zoom)",
    locationKind: "online",
    badge: "online",
    imageUrl: "https://picsum.photos/seed/evt-case-seminar/800/500",
    category: "セミナー",
    jobTypes: ["金融", "コンサル"],
    capacity: 100,
    remainingCapacity: 0,
    applicationDeadline: "2026-05-08",
    targetGraduationYear: 2026,
  },
  {
    id: "evt-5",
    title: "成長ベンチャー 5 社合同 1day 仕事体験",
    dateLabel: "2026.05.18",
    locationLabel: "東京都渋谷区",
    locationKind: "offline",
    badge: "offline",
    imageUrl: "https://picsum.photos/seed/evt-venture-1day/800/500",
    category: "インターンシップ",
    jobTypes: ["エンジニア", "ビジネス"],
    capacity: 20,
    remainingCapacity: 12,
    applicationDeadline: "2026-05-15",
    targetGraduationYear: 2028,
  },
  {
    id: "evt-6",
    title: "PwC ケース対策ワークショップ (実践型)",
    dateLabel: "2026.06.15",
    locationLabel: "東京都千代田区 / オンライン併用",
    locationKind: "hybrid",
    badge: "hybrid",
    imageUrl: "https://picsum.photos/seed/evt-pwc-workshop/800/500",
    category: "セミナー",
    jobTypes: ["コンサル"],
    capacity: 60,
    remainingCapacity: 35,
    applicationDeadline: "2026-06-10",
    targetGraduationYear: 2029,
  },
  {
    id: "evt-7",
    title: "キャリアフェア 2026 春 (大手 30 社合同)",
    dateLabel: "2026.04.20",
    locationLabel: "幕張メッセ",
    locationKind: "offline",
    badge: "offline",
    imageUrl: "https://picsum.photos/seed/evt-career-fair/800/500",
    category: "合同企業説明会",
    jobTypes: [],
    capacity: 1000,
    remainingCapacity: 0,
    applicationDeadline: "2026-04-15",
    targetGraduationYear: null,
  },
  {
    id: "evt-8",
    title: "LINEヤフー サマーインターン説明会",
    dateLabel: "2026.05.25",
    locationLabel: "オンライン (YouTube Live)",
    locationKind: "online",
    badge: "online",
    imageUrl: "https://picsum.photos/seed/evt-lineyahoo/800/500",
    category: "会社説明会",
    jobTypes: ["エンジニア", "デザイナー", "ビジネス"],
    capacity: 300,
    remainingCapacity: 220,
    applicationDeadline: "2026-05-20",
    targetGraduationYear: 2027,
  },
  {
    id: "evt-9",
    title: "アクセンチュア 1week サマージョブ",
    dateLabel: "2026.07.13 - 07.17",
    locationLabel: "東京都港区赤坂",
    locationKind: "offline",
    badge: "exclusive",
    imageUrl: "https://picsum.photos/seed/evt-accenture-job/800/500",
    category: "インターンシップ",
    jobTypes: ["コンサル", "ビジネス"],
    capacity: 40,
    remainingCapacity: 30,
    applicationDeadline: "2026-06-25",
    targetGraduationYear: 2030,
  },
  {
    id: "evt-10",
    title: "学生交流会 ボードゲーム & ピザナイト",
    dateLabel: "2026.05.04",
    locationLabel: "東京都目黒区",
    locationKind: "offline",
    badge: "offline",
    imageUrl: "https://picsum.photos/seed/evt-boardgame/800/500",
    category: "その他",
    jobTypes: [],
    capacity: 50,
    remainingCapacity: 25,
    applicationDeadline: "2026-05-02",
    targetGraduationYear: null,
  },
];

/** EventItem を元に最低限の EventDetail を生成。詳細フィールドは overrides で上書きする。 */
function buildDetail(
  item: EventItem,
  overrides: Partial<EventDetail> = {},
): EventDetail {
  return {
    id: item.id,
    title: item.title,
    dateLabel: item.dateLabel,
    locationLabel: item.locationLabel,
    heroImageUrl: item.imageUrl,
    heroEyebrow: item.category === "その他" ? "イベント" : item.category,
    description: [],
    speakers: [],
    schedule: [],
    access: null,
    capacity: item.capacity,
    remainingCapacity: item.remainingCapacity,
    applicationDeadline: item.applicationDeadline,
    targetGraduationYear: item.targetGraduationYear,
    jobTypes: item.jobTypes,
    // 以下は mock 用のデフォルト。実 DB 由来の場合は mapDbEventToEventDetail で詰める。
    format: item.locationKind,
    onlineUrl:
      item.locationKind === "online" || item.locationKind === "hybrid"
        ? "https://example.com/meet"
        : null,
    dateTimeRangeLabel: `${item.dateLabel} 19:00 〜 20:30`,
    applicationDeadlineDateTimeLabel: item.applicationDeadline
      ? `${item.applicationDeadline.replace(/-/g, ".")} 23:59`
      : null,
    ...overrides,
  };
}

const itemById = new Map(MOCK_EVENT_ITEMS.map((e) => [e.id, e]));

export const MOCK_EVENT_DETAILS: Record<string, EventDetail> = {
  // 特集枠 (rich)
  "evt-1": buildDetail(itemById.get("evt-1")!, {
    heroEyebrow: "特別招待枠",
    description: [
      "ゴールドマン・サックスのアジアテクノロジー部門が、2027 卒向けサマーインターンの全貌をお伝えする説明会です。",
      "実際のプロジェクト事例、選考プロセスの詳細、現役社員との Q&A セッションを 90 分にわたってお届けします。",
      "対面参加者には限定パンフレットとオフィスツアー (希望者のみ) もご用意しています。",
    ],
    speakers: [
      {
        id: "spk-1-1",
        name: "山田 直樹",
        role: "Vice President, Engineering",
        bio: "東京拠点で決済プラットフォームの開発をリード。CMU 卒、入社 8 年目。",
        imageUrl: "https://picsum.photos/seed/spk-yamada/240/240",
      },
      {
        id: "spk-1-2",
        name: "Emma Chen",
        role: "Engineering Manager",
        bio: "シンガポール出身、香港・東京を行き来しながら採用責任者を務める。",
        imageUrl: "https://picsum.photos/seed/spk-chen/240/240",
      },
      {
        id: "spk-1-3",
        name: "佐藤 美咲",
        role: "Recruiter, Campus Hiring",
        bio: "学生向けイベントを多数企画。今年で 4 年連続の登壇。",
        imageUrl: "https://picsum.photos/seed/spk-sato-recruit/240/240",
      },
    ],
    schedule: [
      {
        id: "sch-1-1",
        timeRange: "19:00 - 19:15",
        title: "オープニング & 会社紹介",
      },
      {
        id: "sch-1-2",
        timeRange: "19:15 - 19:45",
        title: "サマーインターンプログラム概要",
        caption: "実プロジェクトの事例 / メンター制度 / 福利厚生",
        emphasized: true,
      },
      {
        id: "sch-1-3",
        timeRange: "19:45 - 20:15",
        title: "現役社員パネルディスカッション",
      },
      {
        id: "sch-1-4",
        timeRange: "20:15 - 20:30",
        title: "Q&A / クロージング",
      },
    ],
    access: {
      address: "東京都千代田区六番町 6-1",
      venue: "ゴールドマン・サックス東京オフィス 12F イベントホール",
      mapEmbedUrl:
        "https://www.google.com/maps?q=%E3%82%B4%E3%83%BC%E3%83%AB%E3%83%89%E3%83%9E%E3%83%B3%E3%83%BB%E3%82%B5%E3%83%83%E3%82%AF%E3%82%B9%E6%97%A5%E6%9C%AC&z=15&output=embed",
    },
  }),
  "evt-3": buildDetail(itemById.get("evt-3")!, {
    heroEyebrow: "サマーインターンシップ",
    description: [
      "メルカリのプロダクトチームに 2 週間ジョインし、現役エンジニア・PM とともに実プロダクトの一部を改善するインターンシップです。",
      "業務時間中はオフィス推奨ですが、リモート参加も可能。チームに溶け込みながら自分のアウトプットを残せる設計になっています。",
      "選考は ES + 1 次面接 + 技術課題。最終日には全社発表会を予定しています。",
    ],
    speakers: [
      {
        id: "spk-3-1",
        name: "中村 翔太",
        role: "Director of Product",
        bio: "メルペイ立ち上げメンバー。元 SRE、現在は B2C プロダクト全般を統括。",
        imageUrl: "https://picsum.photos/seed/spk-nakamura/240/240",
      },
      {
        id: "spk-3-2",
        name: "Lin Wei",
        role: "Senior Engineer",
        bio: "Search Platform チームのテックリード。インターン制度の発案者。",
        imageUrl: "https://picsum.photos/seed/spk-lin/240/240",
      },
    ],
    schedule: [
      {
        id: "sch-3-1",
        timeRange: "Day 1",
        title: "オリエンテーション & チーム配属",
      },
      {
        id: "sch-3-2",
        timeRange: "Day 2 - 4",
        title: "オンボーディング & 初期タスク",
        caption: "メンターとの 1on1、課題定義",
      },
      {
        id: "sch-3-3",
        timeRange: "Day 5 - 12",
        title: "実装 & レビューサイクル",
        emphasized: true,
      },
      {
        id: "sch-3-4",
        timeRange: "Day 13 - 14",
        title: "全社発表 & クロージング",
      },
    ],
    access: {
      address: "東京都港区六本木 6-10-1",
      venue: "六本木ヒルズ森タワー (メルカリ本社)",
      mapEmbedUrl:
        "https://www.google.com/maps?q=%E5%85%AD%E6%9C%AC%E6%9C%A8%E3%83%92%E3%83%AB%E3%82%BA%E6%A3%AE%E3%82%BF%E3%83%AF%E3%83%BC&z=15&output=embed",
    },
  }),

  // 残りはミニマル
  "evt-2": buildDetail(itemById.get("evt-2")!, {
    description: [
      "国内トップティア 8 社が一堂に集う合同説明会。各社のブースを自由に回って質問できます。",
      "事前申込で配布資料 (各社) と軽食をご用意。同伴者の同行不可。",
    ],
  }),
  "evt-4": buildDetail(itemById.get("evt-4")!, {
    description: [
      "外資系投資銀行 / コンサルの選考で頻出するケース面接の対策をオンラインで実施。",
      "お申込多数のため、定員に達した場合は次回 6 月開催分を案内します。",
    ],
  }),
  "evt-5": buildDetail(itemById.get("evt-5")!, {
    description: [
      "成長中の Tech ベンチャー 5 社が合同で 1 日仕事体験を実施。",
      "実際のチームに 1 日入って小さな課題に取り組み、フィードバックをもらえます。",
    ],
  }),
  "evt-6": buildDetail(itemById.get("evt-6")!, {
    description: [
      "PwC コンサルティングのシニアコンサルタント陣がファシリテーターとして登壇。",
      "実ケースを使ったハンズオンで、フレームワークの「使い方」ではなく「なぜ使うか」を学びます。",
    ],
  }),
  "evt-7": buildDetail(itemById.get("evt-7")!, {
    description: [
      "本イベントは終了しました。次回は 2026 年秋開催予定です。",
    ],
  }),
  "evt-8": buildDetail(itemById.get("evt-8")!, {
    description: [
      "LINEヤフーのサマーインターンシップ概要を YouTube Live でお届け。アーカイブ視聴も可能です。",
      "応募締切は 5/20。エンジニア / デザイナー / プランナー の 3 コースを募集します。",
    ],
  }),
  "evt-9": buildDetail(itemById.get("evt-9")!, {
    description: [
      "アクセンチュアの 1 週間集中型サマージョブ。実プロジェクト形式でチームに混じって課題に挑戦します。",
    ],
  }),
  "evt-10": buildDetail(itemById.get("evt-10")!, {
    description: [
      "学年・専攻問わず参加できる気軽な交流会。ボードゲームとピザを囲みながらフラットに話せます。",
      "服装自由・出入り自由。途中参加 / 途中退席 OK。",
    ],
  }),
};
