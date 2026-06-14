import { formatTaipeiDateTime, todayInTaipei } from "../utils.js";

export function composeReport(items, config, refreshedAt = new Date().toISOString()) {
  const date = todayInTaipei();
  const highItems = items.filter((item) => item.score >= config.thresholds.high);
  const watchItems = items.filter((item) =>
    item.score >= config.thresholds.watch && item.score < config.thresholds.high
  );
  const reportItems = highItems.length > 0 ? highItems : watchItems.slice(0, 5);

  const lines = [
    `# 台灣即時新聞監控簡報 - ${date}`,
    "",
    `更新時間：${formatTaipeiDateTime(refreshedAt)}`,
    `追蹤主題：${config.topic}`,
    `社群平台：${(config.socialPlatforms || []).join("、") || "未設定"}`,
    `重點類型：${(config.focusCategories || []).join("、") || "未設定"}`,
    "",
    "## 今日可追重點",
    ""
  ];

  if (reportItems.length === 0) {
    lines.push("目前沒有超過門檻的重點新聞。建議稍後重新刷新來源，或放寬監控關鍵字。", "");
  } else {
    reportItems.forEach((item, index) => {
      lines.push(`### ${index + 1}. ${item.title}`);
      lines.push("");
      lines.push(`- 來源：${item.sourceName}`);
      lines.push(`- 分類：${item.category}`);
      lines.push(`- 信心指數：${item.score}/100`);
      lines.push(`- 發布時間：${formatTaipeiDateTime(item.publishedAt)}`);
      lines.push(`- 新聞摘要：${item.brief.summary}`);
      lines.push(`- 社群角度：${item.brief.whyItMatters}`);
      lines.push(`- 建議動作：${item.brief.nextAction}`);
      lines.push(`- 評分拆解：來源 ${item.scoring.officialScore}、關鍵字 ${item.scoring.keywordScore}、新鮮度 ${item.scoring.freshnessScore}、重點類型 ${item.scoring.focusScore}`);
      lines.push(`- 原文：${item.url}`);
      lines.push("");
    });
  }

  lines.push("## 值得留意清單");
  lines.push("");

  if (watchItems.length === 0) {
    lines.push("沒有中優先觀察項目。");
  } else {
    watchItems.slice(0, 8).forEach((item) => {
      lines.push(`- ${item.score}/100｜${item.sourceName}｜${item.title}｜${item.url}`);
    });
  }

  lines.push("");
  lines.push("## 備註");
  lines.push("");
  lines.push("這份簡報由規則式 Agent 流程產生，尚未接入付費 AI API；正式發稿、製圖或社群發布前，仍需人工查核原文、時間與交叉來源。");
  lines.push("");

  return lines.join("\n");
}
