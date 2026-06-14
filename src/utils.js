import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
export const projectRoot = path.resolve(path.dirname(__filename), "..");

export function resolveProjectPath(...parts) {
  return path.join(projectRoot, ...parts);
}

export async function readJson(relativePath, fallback = null) {
  try {
    const raw = await fs.readFile(resolveProjectPath(relativePath), "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (fallback !== null) return fallback;
    throw error;
  }
}

export async function writeJson(relativePath, data) {
  const target = resolveProjectPath(relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function writeText(relativePath, content) {
  const target = resolveProjectPath(relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

export function todayInTaipei() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function formatTaipeiDateTime(dateInput) {
  if (!dateInput) return "未知時間";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "未知時間";

  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function stripHtml(input = "") {
  return decodeHtml(input ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function decodeHtml(input = "") {
  return String(input ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

export function excerpt(input = "", length = 220) {
  const clean = stripHtml(input);
  if (clean.length <= length) return clean;
  return `${clean.slice(0, length).trim()}...`;
}

export function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
