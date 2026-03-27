import { APP_CONFIG } from "../app-config.js";
import { requireConfiguredApiUrl } from "./env.js";

function buildQuery(params) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  return searchParams.toString();
}

async function requestJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), APP_CONFIG.requestTimeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`API trả về lỗi HTTP ${response.status}`);
    }

    const responseText = await response.text();
    const payload = JSON.parse(responseText);

    if (!payload.success) {
      throw new Error(payload.message || "API trả về lỗi không xác định");
    }

    return payload.data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("API phản hồi quá chậm, vui lòng thử lại");
    }

    if (error instanceof SyntaxError) {
      throw new Error("API không trả về JSON hợp lệ");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function getUrl(action, params = {}) {
  const apiBaseUrl = requireConfiguredApiUrl();
  const query = buildQuery({
    action,
    ...params
  });

  return `${apiBaseUrl}?${query}`;
}

export const api = {
  async login(username, password) {
    const apiBaseUrl = requireConfiguredApiUrl();
    const body = new URLSearchParams({
      action: "login",
      username,
      password
    });

    return requestJson(apiBaseUrl, {
      method: "POST",
      body
    });
  },

  async getSession(token) {
    return requestJson(getUrl("session", { token }));
  },

  async getStats(token) {
    return requestJson(getUrl("stats", { token }));
  },

  async getStudents(token) {
    return requestJson(getUrl("students", { token }));
  },

  async getReport(token, year) {
    return requestJson(getUrl("report", { token, year }));
  },

  async getPlanner(token, weekStart) {
    return requestJson(getUrl("planner", { token, weekStart }));
  }
};
