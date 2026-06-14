const state = {
  config: null,
  items: [],
  sourceStatuses: [],
  review: null,
  report: "",
  refreshedAt: null
};

const elements = {
  refreshButton: document.querySelector("#refreshButton"),
  copyReportButton: document.querySelector("#copyReportButton"),
  statsGrid: document.querySelector("#statsGrid"),
  sourceStatuses: document.querySelector("#sourceStatuses"),
  newsList: document.querySelector("#newsList"),
  reportOutput: document.querySelector("#reportOutput"),
  itemCount: document.querySelector("#itemCount"),
  lastUpdated: document.querySelector("#lastUpdated"),
  priorityFilter: document.querySelector("#priorityFilter"),
  sourceFilter: document.querySelector("#sourceFilter"),
  sortMode: document.querySelector("#sortMode"),
  searchInput: document.querySelector("#searchInput"),
  toast: document.querySelector("#toast")
};

elements.refreshButton.addEventListener("click", refreshNews);
elements.copyReportButton.addEventListener("click", copyReport);
elements.priorityFilter.addEventListener("change", renderNews);
elements.sourceFilter.addEventListener("change", renderNews);
elements.sortMode.addEventListener("change", renderNews);
elements.searchInput.addEventListener("input", renderNews);

await init();

async function init() {
  try {
    const [config, itemState, reportState] = await Promise.all([
      fetchJson("/api/config"),
      fetchJson("/api/items"),
      fetchJson("/api/report")
    ]);

    state.config = config;
    state.items = itemState.items || [];
    state.sourceStatuses = itemState.sourceStatuses || [];
    state.review = itemState.review || null;
    state.report = reportState.report || "";
    state.refreshedAt = itemState.refreshedAt;

    hydrateSourceFilter();
    render();
  } catch (error) {
    showToast(`初始化失敗：${error.message}`);
  }
}

async function refreshNews() {
  setLoading(true);
  showToast("正在抓取台灣即時新聞來源，第一次可能需要一些時間...");

  try {
    const refreshed = await fetchJson("/api/refresh", { method: "POST" });
    state.items = refreshed.items || [];
    state.sourceStatuses = refreshed.sourceStatuses || [];
    state.review = refreshed.review || null;
    state.report = refreshed.report || "";
    state.refreshedAt = refreshed.refreshedAt;

    hydrateSourceFilter();
    render();
    showToast(`刷新完成：${state.items.length} 則新聞`);
  } catch (error) {
    showToast(`刷新失敗：${error.message}`);
  } finally {
    setLoading(false);
  }
}

function render() {
  renderStats();
  renderSources();
  renderNews();
  renderReport();
}

function renderStats() {
  const totalSources = state.config?.sources?.length || 0;
  const failedSources = state.sourceStatuses.filter((source) => !source.ok).length;
  const highItems = state.items.filter((item) => item.priority === "high").length;
  const duplicates = state.review?.duplicatesRemoved || 0;

  const stats = [
    ["追蹤來源", totalSources],
    ["抓到新聞", state.items.length],
    ["高優先新聞", highItems],
    ["失敗來源 / 重複", `${failedSources} / ${duplicates}`]
  ];

  elements.statsGrid.innerHTML = stats.map(([label, value]) => `
    <div class="stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `).join("");

  elements.lastUpdated.textContent = state.refreshedAt
    ? `更新：${formatDateTime(state.refreshedAt)}`
    : "尚未刷新";
}

function renderSources() {
  if (state.sourceStatuses.length === 0) {
    elements.sourceStatuses.innerHTML = `<div class="empty-state">尚未讀取來源狀態</div>`;
    return;
  }

  elements.sourceStatuses.innerHTML = state.sourceStatuses.map((source) => `
    <article class="source-chip ${source.ok ? "ok" : "fail"}">
      <strong>${escapeHtml(source.sourceName)}</strong>
      <span>${source.ok ? "正常" : "失敗"}｜${source.itemCount || 0} 則</span>
      <span>${escapeHtml(source.message || "")}</span>
    </article>
  `).join("");
}

function renderNews() {
  const filtered = filteredItems();
  elements.itemCount.textContent = `${filtered.length} 則`;

  if (filtered.length === 0) {
    elements.newsList.innerHTML = `<div class="empty-state">沒有符合條件的新聞</div>`;
    return;
  }

  elements.newsList.innerHTML = filtered.map((item) => `
    <article class="news-card">
      <div class="news-topline">
        <div class="badges">
          <span class="badge ${item.priority}">${priorityLabel(item.priority)}</span>
          <span class="badge">${escapeHtml(item.category)}</span>
          <span class="badge">${escapeHtml(item.sourceName)}</span>
        </div>
        <div class="score">${item.score}</div>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.brief?.summary || item.description || "沒有摘要")}</p>
      <p><strong>為什麼重要：</strong>${escapeHtml(item.brief?.whyItMatters || "")}</p>
      <p><strong>下一步：</strong>${escapeHtml(item.brief?.nextAction || "")}</p>
      <div class="meta">
        <span>${formatDateTime(item.publishedAt)}</span>
        <span>${escapeHtml((item.matchedKeywords || []).slice(0, 5).join("、") || "未命中關鍵字")}</span>
      </div>
      <div class="news-actions">
        <a href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">開啟原文</a>
      </div>
    </article>
  `).join("");
}

function renderReport() {
  elements.reportOutput.textContent = state.report || "尚未產生簡報。按下重新刷新開始抓取台灣即時新聞來源。";
}

function hydrateSourceFilter() {
  const current = elements.sourceFilter.value;
  const sources = [...new Set(state.items.map((item) => item.sourceName).filter(Boolean))].sort();
  elements.sourceFilter.innerHTML = [
    `<option value="all">全部來源</option>`,
    ...sources.map((source) => `<option value="${escapeAttribute(source)}">${escapeHtml(source)}</option>`)
  ].join("");

  if (sources.includes(current)) {
    elements.sourceFilter.value = current;
  }
}

function filteredItems() {
  const priority = elements.priorityFilter.value;
  const source = elements.sourceFilter.value;
  const query = elements.searchInput.value.trim().toLowerCase();
  const sortMode = elements.sortMode.value;

  const filtered = state.items.filter((item) => {
    if (priority !== "all" && item.priority !== priority) return false;
    if (source !== "all" && item.sourceName !== source) return false;
    if (!query) return true;

    const haystack = [
      item.title,
      item.description,
      item.sourceName,
      item.category,
      ...(item.matchedKeywords || [])
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  });

  return filtered.sort((a, b) => {
    if (sortMode === "time") {
      return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
    }
    return b.score - a.score;
  });
}

async function copyReport() {
  try {
    await navigator.clipboard.writeText(state.report || "");
    showToast("已複製今日簡報");
  } catch {
    showToast("瀏覽器不允許直接複製，請手動選取簡報文字");
  }
}

function setLoading(isLoading) {
  elements.refreshButton.disabled = isLoading;
  elements.refreshButton.classList.toggle("loading", isLoading);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Request failed");
  }
  return payload;
}

function priorityLabel(priority) {
  const labels = {
    high: "高優先",
    watch: "值得留意",
    low: "低優先"
  };
  return labels[priority] || priority;
}

function formatDateTime(value) {
  if (!value) return "未知時間";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未知時間";
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 3200);
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value = "") {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
