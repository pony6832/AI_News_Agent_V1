import { clamp } from "../utils.js";

const CATEGORY_RULES = [
  { category: "生活健康", terms: ["食安", "物價", "停水", "停電", "醫院", "醫師", "健康", "癌", "疫情", "登革熱", "確診", "補助", "勞工"] },
  { category: "政治兩岸", terms: ["總統", "行政院", "立法院", "選舉", "罷免", "國民黨", "民進黨", "民眾黨", "中國", "兩岸"] },
  { category: "地方新聞", terms: ["台北", "新北", "桃園", "台中", "台南", "高雄", "基隆", "新竹", "苗栗", "彰化", "南投", "雲林", "嘉義", "屏東", "宜蘭", "花蓮", "台東", "澎湖", "金門", "連江"] },
  { category: "社會突發", terms: ["命案", "槍擊", "火災", "爆炸", "車禍", "事故", "警方", "警消", "檢警", "地檢", "北檢", "毒品", "失蹤"] },
  { category: "天災交通", terms: ["地震", "颱風", "豪雨", "大雨", "災情", "停班停課", "交通", "捷運", "台鐵", "高鐵"] },
  { category: "財經產業", terms: ["台股", "台積電", "匯率", "央行", "通膨", "房市", "半導體", "美股", "金管會"] },
  { category: "國際焦點", terms: ["美國", "日本", "中國", "戰爭", "川普", "國際", "外交", "以色列", "烏克蘭"] },
  { category: "娛樂社群", terms: ["藝人", "網紅", "社群", "炎上", "道歉", "直播", "Threads", "Facebook", "IG"] },
  { category: "體育娛樂", terms: ["中職", "職棒", "籃球", "世足", "奧運", "演唱會", "金曲", "電影"] }
];

export function scoreItems(items, config) {
  const seenUrls = new Set();

  return items.map((item) => {
    const text = `${item.title} ${item.description}`.toLowerCase();
    const matchedKeywords = matchKeywords(text, config.keywords);
    const officialScore = clamp(item.officialWeight || 40, 0, 40);
    const keywordScore = clamp(matchedKeywords.length * 8, 0, 30);
    const freshnessScore = calculateFreshnessScore(item.publishedAt);
    const normalizedUrl = item.url.toLowerCase();
    const uniquenessScore = seenUrls.has(normalizedUrl) ? 0 : 10;
    seenUrls.add(normalizedUrl);
    const category = inferCategory(text);
    const focusScore = (config.focusCategories || []).includes(category) ? 10 : 0;

    const score = clamp(officialScore + keywordScore + freshnessScore + uniquenessScore + focusScore, 0, 100);

    return {
      ...item,
      matchedKeywords,
      category,
      score,
      priority: toPriority(score, config.thresholds),
      scoring: {
        officialScore,
        keywordScore,
        freshnessScore,
        uniquenessScore,
        focusScore
      },
      brief: buildRuleBrief(item, matchedKeywords, category, config)
    };
  }).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
  });
}

function matchKeywords(text, keywords) {
  return keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
}

function calculateFreshnessScore(publishedAt) {
  if (!publishedAt) return 6;

  const ageMs = Date.now() - new Date(publishedAt).getTime();
  const ageHours = ageMs / 1000 / 60 / 60;

  if (ageHours <= 24) return 20;
  if (ageHours <= 72) return 16;
  if (ageHours <= 168) return 12;
  if (ageHours <= 720) return 8;
  return 4;
}

function toPriority(score, thresholds) {
  if (score >= thresholds.high) return "high";
  if (score >= thresholds.watch) return "watch";
  return "low";
}

function inferCategory(text) {
  const matched = CATEGORY_RULES.find((rule) =>
    rule.terms.some((term) => text.includes(term.toLowerCase()))
  );
  return matched?.category || "一般更新";
}

function buildRuleBrief(item, matchedKeywords, category, config) {
  const keywordText = matchedKeywords.length > 0
    ? `命中關鍵字：${matchedKeywords.slice(0, 5).join("、")}。`
    : "目前未命中高權重關鍵字，但來自新聞來源。";
  const platformText = recommendPlatforms(category, config.socialPlatforms || []).join("、");

  return {
    summary: item.description || "來源未提供摘要，建議開啟原文確認細節。",
    whyItMatters: `${keywordText}這則消息屬於「${category}」，可能具有即時性、公共影響或社群討論潛力。`,
    nextAction: `建議先核對原文與至少一個交叉來源，再評估 ${platformText || "Facebook、Threads、IG、YouTube"} 的發文型態。`
  };
}

function recommendPlatforms(category, configuredPlatforms) {
  const available = configuredPlatforms.length > 0
    ? configuredPlatforms
    : ["Facebook", "Threads", "IG", "YouTube"];

  const preferredByCategory = {
    社會突發: ["Facebook", "Threads"],
    政治兩岸: ["Facebook", "Threads", "YouTube"],
    生活健康: ["Facebook", "IG", "YouTube"],
    地方新聞: ["Facebook", "Threads"],
    娛樂社群: ["Threads", "IG", "YouTube"],
    天災交通: ["Facebook", "Threads", "IG"],
    國際焦點: ["Facebook", "Threads"],
    體育娛樂: ["Threads", "IG", "YouTube"]
  };

  const preferred = preferredByCategory[category] || available;
  return preferred.filter((platform) => available.includes(platform));
}
