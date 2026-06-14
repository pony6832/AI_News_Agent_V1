# 台灣即時新聞情報 Agent V1

這是一個本機網頁儀表板，用來追蹤台灣即時新聞來源，協助新聞網社群主管快速判斷「能不能發、要不要跟、會不會燒」。

## 目前版本做什麼

- 從台灣新聞 RSS/Atom 或官方即時頁抓新聞
- 以規則式 Agent 流程計算社群監控分數
- 去除重複新聞並檢查資料完整性
- 產出本機儀表板與 Markdown 監控簡報
- 保留可插拔結構，之後可接 OpenAI API 做真正摘要、改標與社群貼文草稿

## 啟動方式

給團隊同事使用時，請優先雙擊：

```text
START_HERE.bat
```

手動刷新可雙擊：

```text
REFRESH_NEWS.bat
```

完整移植說明見：

```text
TEAM_PORTABLE_README.md
```

工程模式可使用：

```powershell
cd AI_News_Agent_V1
node server.js
```

打開：

```text
http://localhost:4173
```

## 主要資料

- `data/config.json`：新聞來源、監控關鍵字、分數門檻
- `data/news-cache.json`：抓取後的新聞快取
- `data/reports/YYYY-MM-DD.md`：每日新聞監控簡報

## 第一版限制

這一版不使用付費 AI API。摘要是規則式與原文描述整理，目標是先建立可運作的新聞監控 Agent 工作流骨架。
