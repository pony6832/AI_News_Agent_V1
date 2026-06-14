import { decodeHtml, excerpt, normalizeUrl, stripHtml } from "../utils.js";

const REQUEST_HEADERS = {
  "user-agent": "AI-News-Agent-V1/1.0 (+local research dashboard)",
  "accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8"
};

export async function fetchAllSources(config) {
  const results = await Promise.allSettled(
    config.sources.map((source) => fetchSource(source))
  );

  const items = [];
  const sourceStatuses = [];

  results.forEach((result, index) => {
    const source = config.sources[index];
    if (result.status === "fulfilled") {
      items.push(...result.value.items);
      sourceStatuses.push(result.value.status);
      return;
    }

    sourceStatuses.push({
      sourceId: source.id,
      sourceName: source.name,
      ok: false,
      itemCount: 0,
      message: result.reason?.message || "來源讀取失敗",
      feedUrl: source.feedUrl,
      discoveredFeedUrl: null
    });
  });

  return { items, sourceStatuses };
}

async function fetchSource(source) {
  const attempts = [];

  if (source.feedUrl) attempts.push(source.feedUrl);
  const discoveredFeed = await discoverFeed(source).catch(() => null);
  if (discoveredFeed && !attempts.includes(discoveredFeed)) {
    attempts.push(discoveredFeed);
  }

  let lastError = null;
  for (const feedUrl of attempts) {
    try {
      const response = await fetch(feedUrl, { headers: REQUEST_HEADERS });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const body = await response.text();
      const parsedItems = parseFeed(body, source, feedUrl);
      if (parsedItems.length === 0) {
        lastError = new Error("feed 沒有可用新聞項目");
        continue;
      }

      return {
        items: parsedItems,
        status: {
          sourceId: source.id,
          sourceName: source.name,
          ok: true,
          itemCount: parsedItems.length,
          message: parsedItems.length > 0 ? "讀取成功" : "讀取成功，但沒有解析到項目",
          feedUrl: source.feedUrl,
          discoveredFeedUrl: discoveredFeed
        }
      };
    } catch (error) {
      lastError = error;
    }
  }

  const scrapedItems = await scrapeHomepageItems(source).catch(() => []);
  if (scrapedItems.length > 0) {
    return {
      items: scrapedItems,
      status: {
        sourceId: source.id,
        sourceName: source.name,
        ok: true,
        itemCount: scrapedItems.length,
        message: "未找到可用 feed，已改用官方頁面連結掃描",
        feedUrl: source.feedUrl,
        discoveredFeedUrl: discoveredFeed
      }
    };
  }

  return {
    items: [],
    status: {
      sourceId: source.id,
      sourceName: source.name,
      ok: false,
      itemCount: 0,
      message: lastError?.message || "找不到可用 feed",
      feedUrl: source.feedUrl,
      discoveredFeedUrl: discoveredFeed
    }
  };
}

async function scrapeHomepageItems(source) {
  if (!source.homepage) return [];

  const response = await fetch(source.homepage, {
    headers: { ...REQUEST_HEADERS, accept: "text/html,application/xhtml+xml" }
  });
  if (!response.ok) return [];

  const html = await response.text();
  const links = [
    ...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)
  ].map((match) => ({ href: match[1], text: match[2] }));
  const hrefOnlyLinks = [...html.matchAll(/href=["']([^"']+)["']/gi)]
    .map((match) => ({ href: match[1], text: "" }));
  const seen = new Set();
  const items = [];

  for (const link of [...links, ...hrefOnlyLinks]) {
    const url = normalizeUrl(resolveUrl(link.href, source.homepage));
    if (!isLikelyArticleUrl(url, source.homepage)) continue;
    if (seen.has(url)) continue;
    seen.add(url);

    const title = stripHtml(link.text) || titleFromUrl(url);
    if (!title || title.length < 8) continue;

    items.push(normalizeItem({
      source,
      feedUrl: source.homepage,
      title,
      link: url,
      description: title,
      publishedAt: null
    }));

    if (items.length >= 12) break;
  }

  return items;
}

function isLikelyArticleUrl(url, homepage) {
  try {
    const parsed = new URL(url);
    const home = new URL(homepage);
    if (parsed.hostname !== home.hostname) return false;
    const normalizedHomePath = home.pathname.replace(/\/$/, "") || "/";
    const normalizedPath = parsed.pathname.replace(/\/$/, "") || "/";
    if (normalizedPath === normalizedHomePath) return false;
    if (parsed.pathname.length < 8) return false;

    const patterns = [
      /\/(blog|news|research|posts?|story|article|realtimenews|newspapers)\//i,
      /\/News\.aspx/i,
      /\/[a-z-]+\/\d{5,}/i,
      /\/[a-z]+\/\d{6}\/\d+\.html/i,
      /\/\d{8,}[-\w]*\.html/i
    ];

    return patterns.some((pattern) => pattern.test(`${parsed.pathname}${parsed.search}`));
  } catch {
    return false;
  }
}

function titleFromUrl(url) {
  try {
    const parsed = new URL(url);
    const newsId = parsed.searchParams.get("NewsID");
    if (newsId) return `三立新聞 ${newsId}`;

    const slug = parsed.pathname.split("/").filter(Boolean).pop() || "";
    return slug
      .replace(/\.(html|aspx)$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim();
  } catch {
    return "";
  }
}

async function discoverFeed(source) {
  if (!source.homepage) return null;

  const response = await fetch(source.homepage, {
    headers: { ...REQUEST_HEADERS, accept: "text/html,application/xhtml+xml" }
  });
  if (!response.ok) return null;

  const html = await response.text();
  const linkMatches = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
  const feedLink = linkMatches.find((tag) => {
    const type = getAttribute(tag, "type") || "";
    const rel = getAttribute(tag, "rel") || "";
    return /alternate/i.test(rel) && /(rss|atom|xml)/i.test(type);
  });

  if (!feedLink) return null;

  const href = getAttribute(feedLink, "href");
  if (!href) return null;
  return new URL(href, source.homepage).toString();
}

function getAttribute(tag, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i");
  return tag.match(pattern)?.[1] || null;
}

function parseFeed(xml, source, feedUrl) {
  if (/<entry[\s>]/i.test(xml)) return parseAtom(xml, source, feedUrl);
  return parseRss(xml, source, feedUrl);
}

function parseRss(xml, source, feedUrl) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)]
    .slice(0, 20)
    .map((match) => {
      const block = match[0];
      const title = readTag(block, "title");
      const link = readTag(block, "link") || readTag(block, "guid");
      const description = readTag(block, "description") || readTag(block, "content:encoded");
      const publishedAt = readTag(block, "pubDate") || readTag(block, "dc:date");

      return normalizeItem({
        source,
        feedUrl,
        title,
        link,
        description,
        publishedAt
      });
    })
    .filter((item) => item.title && item.url);
}

function parseAtom(xml, source, feedUrl) {
  return [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)]
    .slice(0, 20)
    .map((match) => {
      const block = match[0];
      const title = readTag(block, "title");
      const linkTag = block.match(/<link\b[^>]*>/i)?.[0] || "";
      const link = getAttribute(linkTag, "href") || readTag(block, "id");
      const description = readTag(block, "summary") || readTag(block, "content");
      const publishedAt = readTag(block, "published") || readTag(block, "updated");

      return normalizeItem({
        source,
        feedUrl,
        title,
        link,
        description,
        publishedAt
      });
    })
    .filter((item) => item.title && item.url);
}

function readTag(block, tagName) {
  const escapedTag = tagName.replace(":", "\\:");
  const pattern = new RegExp(`<${escapedTag}\\b[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, "i");
  return decodeHtml(block.match(pattern)?.[1] || "").trim();
}

function normalizeItem({ source, feedUrl, title, link, description, publishedAt }) {
  const url = normalizeUrl(resolveUrl(link, source.homepage || feedUrl));
  const cleanDescription = excerpt(description, 320);

  return {
    id: `${source.id}:${url}`,
    sourceId: source.id,
    sourceName: source.name,
    feedUrl,
    title: stripHtml(title),
    url,
    description: cleanDescription,
    publishedAt: normalizeDate(publishedAt),
    rawPublishedAt: stripHtml(publishedAt),
    officialWeight: source.officialWeight || 40
  };
}

function resolveUrl(value, base) {
  if (!value) return "";
  try {
    return new URL(stripHtml(value), base).toString();
  } catch {
    return stripHtml(value);
  }
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(stripHtml(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
