# 台灣即時新聞情報 Agent：團隊移植說明

這份資料夾是可攜版。解壓縮後，不需要安裝 npm 套件。

## 同事電腦需要先有

- Windows 10/11
- Node.js LTS 或新版 Node.js
- 可連外網路

Node.js 下載：

```text
https://nodejs.org/
```

## 快速啟動

1. 解壓縮整個資料夾。
2. 雙擊 `START_HERE.bat`。
3. 瀏覽器會開啟：

```text
http://localhost:4173
```

啟動後會出現一個伺服器視窗，使用期間不要關閉它。要停止服務時，直接關閉那個視窗即可。

## 手動刷新新聞

方式一：在網頁右上角按「重新刷新」。

方式二：雙擊 `REFRESH_NEWS.bat`，刷新完後回瀏覽器重新整理。

## 目前監控來源

目前包含中央社、自由時報、聯合新聞網、ETtoday、Newtalk、Google 新聞台灣焦點，以及競品媒體：三立、TVBS、東森、民視、華視、鏡新聞、壹蘋、Yahoo、中時新聞網、中天、中國時報。

注意：民視目前會因網站防護而可能顯示抓取失敗，儀表板會標示在來源狀態中。

## 目前社群設定

- 平台：Facebook、Threads、IG、YouTube
- 重點類型：社會突發、政治兩岸、生活健康、娛樂社群、地方新聞

## 修改設定

主要設定在：

```text
data/config.json
```

可修改：

- `sources`：新聞來源
- `keywords`：監控關鍵字
- `socialPlatforms`：社群平台
- `focusCategories`：重點新聞類型
- `thresholds.high`：高優先分數門檻
- `thresholds.watch`：值得留意分數門檻

修改後請重新啟動 `START_HERE.bat`。

## 重要限制

這一版是本機工具，不是雲端服務。每位同事各自在自己的電腦執行，各自刷新資料。

這一版尚未接付費 AI API，因此摘要與建議是規則式產生。正式發稿、製圖或社群發布前，仍需人工查核原文、時間與交叉來源。
