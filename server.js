import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { refreshNews, loadState } from "./src/orchestrator.js";
import { readJson, resolveProjectPath } from "./src/utils.js";

const config = await readJson("data/config.json");
const port = Number(process.env.PORT || config.port || 4173);
const publicDir = resolveProjectPath("public");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === "/api/config" && request.method === "GET") {
      const latestConfig = await readJson("data/config.json");
      return sendJson(response, latestConfig);
    }

    if (url.pathname === "/api/items" && request.method === "GET") {
      const state = await loadState();
      return sendJson(response, {
        refreshedAt: state.cache.refreshedAt,
        items: state.cache.items,
        sourceStatuses: state.cache.sourceStatuses,
        review: state.cache.review
      });
    }

    if (url.pathname === "/api/report" && request.method === "GET") {
      const state = await loadState();
      return sendJson(response, {
        refreshedAt: state.cache.refreshedAt,
        report: state.report
      });
    }

    if (url.pathname === "/api/refresh" && request.method === "POST") {
      const refreshed = await refreshNews();
      return sendJson(response, refreshed);
    }

    if (request.method !== "GET") {
      return sendJson(response, { error: "Method not allowed" }, 405);
    }

    return serveStatic(url.pathname, response);
  } catch (error) {
    console.error(error);
    return sendJson(response, {
      error: "Internal server error",
      message: error.message
    }, 500);
  }
});

server.listen(port, () => {
  console.log(`AI News Agent dashboard is running at http://localhost:${port}`);
});

async function serveStatic(pathname, response) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const resolvedPath = path.normalize(path.join(publicDir, safePath));

  if (!resolvedPath.startsWith(publicDir)) {
    return sendJson(response, { error: "Forbidden" }, 403);
  }

  try {
    const content = await fs.readFile(resolvedPath);
    const extension = path.extname(resolvedPath);
    response.writeHead(200, {
      "content-type": mimeTypes[extension] || "application/octet-stream"
    });
    response.end(content);
  } catch {
    const index = await fs.readFile(path.join(publicDir, "index.html"));
    response.writeHead(200, { "content-type": mimeTypes[".html"] });
    response.end(index);
  }
}

function sendJson(response, payload, status = 200) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload, null, 2));
}
