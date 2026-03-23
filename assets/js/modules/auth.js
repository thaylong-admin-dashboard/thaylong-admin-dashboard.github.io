import { api } from "./api.js";
import { appUrl } from "./env.js";
import { clearSession, getStoredSession, saveSession } from "./storage.js";

function buildSessionPayload(token, responseData) {
  return {
    token,
    username: responseData.admin.username,
    fullName: responseData.admin.fullName,
    role: responseData.admin.role,
    expiresAt: responseData.expiresAt
  };
}

export function redirectToLogin() {
  window.location.assign(appUrl("/"));
}

export function redirectToDashboard() {
  window.location.assign(appUrl("/dashboard/"));
}

export async function loginAndStore(username, password) {
  const responseData = await api.login(username, password);
  const session = buildSessionPayload(responseData.token, responseData);
  saveSession(session);
  return session;
}

export async function restoreSession({ redirectOnFail = false } = {}) {
  const storedSession = getStoredSession();

  if (!storedSession || !storedSession.token) {
    if (redirectOnFail) {
      redirectToLogin();
    }

    return null;
  }

  try {
    const responseData = await api.getSession(storedSession.token);
    const session = buildSessionPayload(storedSession.token, responseData);
    saveSession(session);
    return session;
  } catch (error) {
    clearSession();

    if (redirectOnFail) {
      redirectToLogin();
    }

    throw error;
  }
}

export async function requireAuth() {
  return restoreSession({ redirectOnFail: true });
}

export function logout() {
  clearSession();
  redirectToLogin();
}
