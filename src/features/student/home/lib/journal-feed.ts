import { XMLParser } from "fast-xml-parser";
import type { HomeJournalArticle } from "../schema";

type FeedSource = {
  /** 表示用の配信元名。 */
  label: string;
  url: string;
};

/**
 * キャリア・ジャーナル用の RSS ソース。
 *
 * 必要なら配列に追加するだけで新ソースを増やせる。本番運用時は ToS / robots.txt
 * を確認のうえ採用すること。
 */
const FEED_SOURCES: FeedSource[] = [
  {
    label: "ITmedia ビジネス",
    url: "https://rss.itmedia.co.jp/rss/2.0/business.xml",
  },
];

type RssItem = {
  title?: string | { "#text"?: string };
  link?: string | { "#text"?: string };
  pubDate?: string;
  "dc:date"?: string;
  guid?: string | { "#text"?: string };
};

const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
});

function asText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "#text" in value) {
    const text = (value as { "#text": unknown })["#text"];
    return typeof text === "string" ? text : undefined;
  }
  return undefined;
}

function formatDateLabel(raw: string | undefined): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

type ParsedArticle = HomeJournalArticle & {
  /** sort 用の取得時刻。parse 失敗時は 0（最後尾）。 */
  publishedAt: number;
};

/** 外部 RSS が遅延・ハングしたときに SSR 全体を巻き込まないためのタイムアウト。 */
const FETCH_TIMEOUT_MS = 5000;

async function fetchSource(source: FeedSource): Promise<ParsedArticle[]> {
  const res = await fetch(source.url, {
    next: { revalidate: 3600 },
    headers: { "User-Agent": "scout-product-bot/1.0 (+career-journal)" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`feed ${source.url} -> ${res.status}`);
  const xml = await res.text();
  const parsed = parser.parse(xml) as {
    rss?: { channel?: { item?: RssItem | RssItem[] } };
    "rdf:RDF"?: { item?: RssItem | RssItem[] };
  };
  const rawItems =
    parsed.rss?.channel?.item ?? parsed["rdf:RDF"]?.item ?? [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  return items
    .map((item, idx): ParsedArticle | null => {
      const title = asText(item.title)?.trim();
      const link = asText(item.link)?.trim();
      if (!title || !link) return null;
      const dateRaw = item.pubDate ?? item["dc:date"];
      const parsedDate = dateRaw ? new Date(dateRaw) : null;
      const publishedAt =
        parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.getTime()
          : 0;
      const idBase = asText(item.guid) ?? link;
      return {
        id: `${source.label}-${idx}-${idBase}`,
        title,
        dateLabel: formatDateLabel(dateRaw),
        externalUrl: link,
        sourceLabel: source.label,
        publishedAt,
      };
    })
    .filter((a): a is ParsedArticle => a !== null);
}

/**
 * 全ソースから記事を取得し、日付降順で merge して上位 limit 件を返す。
 * 1 ソースが失敗しても他は返す。全失敗なら空配列。
 */
export async function fetchJournalArticles(
  limit = 4,
): Promise<HomeJournalArticle[]> {
  const results = await Promise.allSettled(FEED_SOURCES.map(fetchSource));
  const all = results.flatMap((r) =>
    r.status === "fulfilled" ? r.value : [],
  );
  all.sort((a, b) => b.publishedAt - a.publishedAt);
  return all.slice(0, limit).map(stripPublishedAt);
}

function stripPublishedAt({
  publishedAt,
  ...rest
}: ParsedArticle): HomeJournalArticle {
  void publishedAt;
  return rest;
}
