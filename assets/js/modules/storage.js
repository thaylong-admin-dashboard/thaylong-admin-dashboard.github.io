import { APP_CONFIG } from "../app-config.js";

export function getStoredSession() {
  const rawValue = window.localStorage.getItem(APP_CONFIG.storageKey);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    window.localStorage.removeItem(APP_CONFIG.storageKey);
    return null;
  }
}

export function saveSession(session) {
  window.localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(APP_CONFIG.storageKey);
}
