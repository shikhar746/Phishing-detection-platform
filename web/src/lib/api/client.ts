// Thin fetch wrapper for the Express API. Auth uses the httpOnly cookies the
// API sets (accessToken / refreshToken), so every request sends credentials
// and an expired access token triggers one silent refresh before giving up.
//
// By default requests are same-origin: Next.js proxies /api/* to the API (see
// next.config.ts), which keeps the auth cookies first-party in production.

import { API_URL } from "@/lib/config";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string = "UNKNOWN",
    public issues?: { path: (string | number)[]; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; issues?: { path: (string | number)[]; message: string }[] };
}

/**
 * Endpoints where a 401 is the answer itself (wrong password, bad or missing
 * refresh token), so refreshing and retrying would be pointless or loop.
 * Everything else — including GET /api/auth/me — retries once after a refresh.
 */
const NO_REFRESH = new Set(["/api/auth/login", "/api/auth/register", "/api/auth/google", "/api/auth/refresh", "/api/auth/logout"]);

let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(`${API_URL}/api/auth/refresh`, { method: "POST", credentials: "include" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      // only bodies need a content type; adding it to GETs would force a CORS preflight
      headers: init.body === undefined ? init.headers : { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0, "NETWORK_ERROR");
  }

  if (res.status === 401 && retry && !NO_REFRESH.has(path)) {
    if (await refreshSession()) return apiFetch<T>(path, init, false);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ErrorBody;
    const message =
      body.error?.message ?? body.error?.issues?.[0]?.message ?? `Request failed (${res.status})`;
    throw new ApiError(message, res.status, body.error?.code, body.error?.issues);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}
