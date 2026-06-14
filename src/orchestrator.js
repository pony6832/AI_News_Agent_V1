import { fetchAllSources } from "./agents/sourceMonitor.js";
import { scoreItems } from "./agents/signalScorer.js";
import { reviewItems } from "./agents/reviewChecker.js";
import { composeReport } from "./agents/briefComposer.js";
import { readJson, todayInTaipei, writeJson, writeText } from "./utils.js";

export async function refreshNews() {
  const config = await readJson("data/config.json");
  const refreshedAt = new Date().toISOString();
  const monitored = await fetchAllSources(config);
  const reviewed = reviewItems(monitored.items);
  const scoredItems = scoreItems(reviewed.items, config);
  const report = composeReport(scoredItems, config, refreshedAt);
  const reportPath = `data/reports/${todayInTaipei()}.md`;

  const cache = {
    refreshedAt,
    items: scoredItems,
    sourceStatuses: monitored.sourceStatuses,
    review: reviewed.review
  };

  await writeJson("data/news-cache.json", cache);
  await writeText(reportPath, report);

  return {
    ...cache,
    report,
    reportPath
  };
}

export async function loadState() {
  const config = await readJson("data/config.json");
  const cache = await readJson("data/news-cache.json", {
    refreshedAt: null,
    items: [],
    sourceStatuses: [],
    review: { duplicatesRemoved: 0, missingFields: [] }
  });
  const report = composeReport(cache.items, config, cache.refreshedAt || new Date().toISOString());

  return { config, cache, report };
}
