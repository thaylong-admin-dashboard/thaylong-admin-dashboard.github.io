import { APP_CONFIG } from "../app-config.js";

function normalizeBasePath(basePath) {
  if (!basePath) {
    return "";
  }

  const trimmed = String(basePath).trim().replace(/\/+$/, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function appUrl(path) {
  const basePath = normalizeBasePath(APP_CONFIG.siteBaseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalizedPath}` || normalizedPath;
}

export function requireConfiguredApiUrl() {
  const apiBaseUrl = String(APP_CONFIG.apiBaseUrl || "").trim();

  if (!apiBaseUrl || apiBaseUrl.includes("PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE")) {
    throw new Error("Chưa cấu hình apiBaseUrl trong assets/js/app-config.js");
  }

  return apiBaseUrl;
}
