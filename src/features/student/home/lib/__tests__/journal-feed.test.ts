import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJournalArticles } from "../journal-feed";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function rssResponse(xml: string, ok = true, status = 200): Response {
  return {
    ok,
    status,
    text: async () => xml,
  } as unknown as Response;
}

const SAMPLE_RSS_2_0 = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>ITmedia ビジネス</title>
    <item>
      <title>新しいキャリア論</title>
      <link>https://example.com/article-1</link>
      <pubDate>Tue, 28 Apr 2026 09:00:00 +0900</pubDate>
      <guid>article-1</guid>
    </item>
    <item>
      <title>古いキャリア論</title>
      <link>https://example.com/article-2</link>
      <pubDate>Mon, 20 Apr 2026 09:00:00 +0900</pubDate>
      <guid>article-2</guid>
    </item>
  </channel>
</rss>`;

describe("fetchJournalArticles", () => {
  it("RSS 2.0 を pubDate 降順でパースする", async () => {
    fetchMock.mockResolvedValueOnce(rssResponse(SAMPLE_RSS_2_0));

    const articles = await fetchJournalArticles();

    expect(articles).toHaveLength(2);
    expect(articles[0].title).toBe("新しいキャリア論");
    expect(articles[1].title).toBe("古いキャリア論");
    expect(articles[0].externalUrl).toBe("https://example.com/article-1");
    expect(articles[0].sourceLabel).toBe("ITmedia ビジネス");
    expect(articles[0].dateLabel).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
  });

  it("title または link が欠けた item は除外する", async () => {
    fetchMock.mockResolvedValueOnce(
      rssResponse(`<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item><title>OK</title><link>https://example.com/ok</link><pubDate>Tue, 28 Apr 2026 09:00:00 +0900</pubDate></item>
  <item><link>https://example.com/no-title</link></item>
  <item><title>no link</title></item>
</channel></rss>`),
    );

    const articles = await fetchJournalArticles();

    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe("OK");
  });

  it("item が単一要素の場合も配列として扱う", async () => {
    fetchMock.mockResolvedValueOnce(
      rssResponse(`<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item><title>only</title><link>https://example.com/only</link><pubDate>Tue, 28 Apr 2026 09:00:00 +0900</pubDate></item>
</channel></rss>`),
    );

    const articles = await fetchJournalArticles();

    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe("only");
  });

  it("RDF (RSS 1.0) 形式の item と dc:date も解釈できる", async () => {
    fetchMock.mockResolvedValueOnce(
      rssResponse(`<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <item>
    <title>rdf article</title>
    <link>https://example.com/rdf-1</link>
    <dc:date>2026-04-28T09:00:00+09:00</dc:date>
  </item>
</rdf:RDF>`),
    );

    const articles = await fetchJournalArticles();

    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe("rdf article");
    expect(articles[0].dateLabel).toBe("2026.04.28");
  });

  it("date parse 失敗時も entry は残し、日付ラベルは空文字になる", async () => {
    fetchMock.mockResolvedValueOnce(
      rssResponse(`<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item><title>broken date</title><link>https://example.com/broken</link><pubDate>not-a-date</pubDate></item>
</channel></rss>`),
    );

    const articles = await fetchJournalArticles();

    expect(articles).toHaveLength(1);
    expect(articles[0].dateLabel).toBe("");
  });

  it("fetch が失敗したソースは無視して空配列を返す", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    const articles = await fetchJournalArticles();

    expect(articles).toEqual([]);
  });

  it("HTTP non-2xx も例外扱いで空配列にフォールバックする", async () => {
    fetchMock.mockResolvedValueOnce(rssResponse("", false, 503));

    const articles = await fetchJournalArticles();

    expect(articles).toEqual([]);
  });

  it("limit 引数で件数を絞れる", async () => {
    fetchMock.mockResolvedValueOnce(rssResponse(SAMPLE_RSS_2_0));

    const articles = await fetchJournalArticles(1);

    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe("新しいキャリア論");
  });

  it("fetch にタイムアウト用の AbortSignal が渡される", async () => {
    fetchMock.mockResolvedValueOnce(rssResponse(SAMPLE_RSS_2_0));

    await fetchJournalArticles();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
