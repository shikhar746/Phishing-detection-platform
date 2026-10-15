import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api/client";
import { authService } from "@/lib/services/auth";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  fetchMock.mockReset();
});

describe("apiFetch", () => {
  it("sends cookies and JSON to the configured API", async () => {
    fetchMock.mockResolvedValue(json(200, { ok: true }));
    await api.post("/api/scans/url", { url: "https://example.com" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://api.test/api/scans/url");
    expect(init).toMatchObject({ method: "POST", credentials: "include", body: '{"url":"https://example.com"}' });
  });

  it("turns the API error envelope into an ApiError", async () => {
    fetchMock.mockResolvedValue(json(409, { error: { code: "EMAIL_ALREADY_IN_USE", message: "Email already registered" } }));
    const err = await api.post("/api/auth/register", {}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, code: "EMAIL_ALREADY_IN_USE", message: "Email already registered" });
  });

  it("uses the first validation issue when there is no message", async () => {
    fetchMock.mockResolvedValue(json(400, { error: { code: "VALIDATION_ERROR", issues: [{ path: ["email"], message: "Enter a valid email address" }] } }));
    const err = (await api.post("/api/auth/login", {}).catch((e) => e)) as ApiError;
    expect(err.message).toBe("Enter a valid email address");
    expect(err.issues).toHaveLength(1);
  });

  it("reports network failures clearly", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(api.get("/api/scans")).rejects.toMatchObject({ code: "NETWORK_ERROR", status: 0 });
  });

  it("refreshes the session once on 401 and retries", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { error: { code: "INVALID_TOKEN" } }))
      .mockResolvedValueOnce(json(200, { user: {} })) // POST /api/auth/refresh
      .mockResolvedValueOnce(json(200, { scans: [] }));
    await expect(api.get("/api/scans")).resolves.toEqual({ scans: [] });
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      "http://api.test/api/scans",
      "http://api.test/api/auth/refresh",
      "http://api.test/api/scans",
    ]);
  });

  it("gives up when the refresh fails", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { error: { code: "INVALID_TOKEN", message: "Session expired" } }))
      .mockResolvedValueOnce(json(401, { error: { code: "INVALID_REFRESH_TOKEN" } }));
    await expect(api.get("/api/scans")).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refreshes an expired session on page load (GET /api/auth/me)", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { error: { code: "INVALID_TOKEN" } }))
      .mockResolvedValueOnce(json(200, { user: {} }))
      .mockResolvedValueOnce(json(200, { user: { id: "u1", email: "a@example.com", name: "A", role: "user" } }));
    await expect(authService.me()).resolves.toMatchObject({ id: "u1" });
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      "http://api.test/api/auth/me",
      "http://api.test/api/auth/refresh",
      "http://api.test/api/auth/me",
    ]);
  });

  it("only sends a JSON content type when there is a body (no CORS preflight for GETs)", async () => {
    fetchMock.mockImplementation(async () => json(200, {}));
    await api.get("/api/scans");
    await api.post("/api/auth/logout");
    await api.post("/api/scans/url", { url: "https://example.com" });
    const headers = fetchMock.mock.calls.map(([, init]) => (init?.headers as Record<string, string> | undefined)?.["Content-Type"]);
    expect(headers).toEqual([undefined, undefined, "application/json"]);
  });

  it("never tries to refresh for auth endpoints", async () => {
    fetchMock.mockResolvedValueOnce(json(401, { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } }));
    await expect(api.post("/api/auth/login", {})).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("authService (real API mode)", () => {
  it("exchanges a Google credential at /api/auth/google", async () => {
    fetchMock.mockResolvedValue(json(201, { user: { id: "u1", email: "a@example.com", name: "A", role: "user" } }));
    const user = await authService.google("google-id-token");
    expect(user.email).toBe("a@example.com");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://api.test/api/auth/google");
    expect(JSON.parse(String(init!.body))).toEqual({ credential: "google-id-token" });
  });

  it("treats 401 from /me as signed out", async () => {
    fetchMock.mockResolvedValue(json(401, { error: { code: "UNAUTHENTICATED" } }));
    await expect(authService.me()).resolves.toBeNull();
  });
});
