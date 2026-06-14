import { normalizeUrl } from "../utils.js";

export function reviewItems(items) {
  const seen = new Set();
  const uniqueItems = [];
  const missingFields = [];
  let duplicatesRemoved = 0;

  for (const item of items) {
    const key = normalizeUrl(item.url || item.id).toLowerCase();
    if (seen.has(key)) {
      duplicatesRemoved += 1;
      continue;
    }
    seen.add(key);

    const missing = ["title", "url", "sourceName"].filter((field) => !item[field]);
    if (missing.length > 0) {
      missingFields.push({
        id: item.id,
        title: item.title || "(無標題)",
        missing
      });
    }

    uniqueItems.push(item);
  }

  return {
    items: uniqueItems,
    review: {
      duplicatesRemoved,
      missingFields
    }
  };
}
