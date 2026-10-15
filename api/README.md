# API — AI Phishing Detection Platform

Express 5 + TypeScript REST API. Auth uses httpOnly JWT cookies (short-lived
access token + rotating refresh token), email/password or Google sign-in.
Data lives in Supabase Postgres. Scoring comes from `@phishlens/core`
(shared with the web app), with VirusTotal and Google Safe Browsing as
reputation inputs.

Setup and deployment are in the [root README](../README.md). From the repo
root: `npm run dev:api`, `npm test -w api`, `npm run seed`.

## Layout

```
src/
  app.ts, server.ts        Express app (middleware, routes) and the listener
  config/env.ts            typed, validated environment
  routes/                  auth, scans, reports, admin
  controllers/             request → response, throwing HttpError on failure
  services/scanner.ts      scan pipeline: rules + reputation → save
  services/keywords.ts     cached admin keyword list
  services/reputation/     VirusTotal v3 + Safe Browsing v4 clients
  repositories/            all Supabase access (users, scans, reports, keywords)
  middlewares/             auth (requireAuth / optionalAuth / requireAdmin),
                           rate limits, the single error handler
  schemas/                 zod request schemas (scan input reuses core's validators)
  scripts/seed.ts          keyword seeding, admin promotion
infra/schema.sql           tables, record_scan() and the admin_user_overview view
```

## Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/health` | — | liveness check |
| POST | `/api/auth/register` | — | `{ name, email, password }` → 201 `{ user }` + cookies |
| POST | `/api/auth/login` | — | `{ email, password }` → `{ user }` + cookies |
| POST | `/api/auth/google` | — | `{ credential }` (Google ID token) → `{ user }` + cookies |
| POST | `/api/auth/refresh` | refresh cookie | rotates both tokens |
| POST | `/api/auth/logout` | — | clears cookies |
| GET | `/api/auth/me` | signed in | current `{ user }` |
| POST | `/api/scans/url` | optional | `{ url }` → 201 `{ scan }`; saved only when signed in |
| POST | `/api/scans/email` | optional | `{ content }` → 201 `{ scan }`; saved only when signed in |
| GET | `/api/scans` | signed in | `{ scans }`, newest first |
| GET | `/api/scans/stats` | signed in | `{ stats, daily }` (14-day chart) |
| GET | `/api/reports` | signed in | `{ reports }`: summary + one per distinct flagged content |
| GET | `/api/admin/analytics` | admin | `{ analytics, daily }` platform-wide |
| GET | `/api/admin/users` | admin | `{ users }` with scan counts and last activity |
| PATCH | `/api/admin/users/:id` | admin | `{ role?, status? }`; not on yourself |
| GET | `/api/admin/logs` | admin | `{ scans }` across all users |
| GET/POST | `/api/admin/keywords` | admin | list / add `{ term, category, weight }` |
| DELETE | `/api/admin/keywords/:id` | admin | 204 |

Every error uses one envelope, written only by the error handler:
`{ "error": { "code", "message", "issues"? } }`.

## How a scan works

1. The input is validated with the same functions the web form uses.
2. For URLs, the keyword list (cached for a minute) and both reputation
   lookups run **in parallel**. Each lookup has a 6 s timeout; a failure or a
   missing key becomes an "unavailable" result instead of failing the scan.
3. `@phishlens/core` scores rules + reputation into a verdict.
4. For signed-in users, `record_scan()` saves the scan and (when medium/high)
   its report row in **one transaction**.

VirusTotal URLs it has never seen are submitted for analysis and reported as
"not yet known" — that is not treated as clean. The free VirusTotal tier
allows 4 lookups a minute; `SCAN_RATE_LIMIT_MAX` limits scans per user.

## Security model

- **Sessions:** httpOnly cookies; the refresh cookie is scoped to
  `/api/auth/refresh`. The browser calls the API through the web app's
  `/api/*` proxy, so cookies are first-party (`COOKIE_SAMESITE=lax`).
- **Admin checks** re-read role and status from the database on every admin
  request, so demoting or suspending an admin takes effect immediately.
  Suspended users can't sign in or refresh; an access token they already hold
  keeps working until it expires (`ACCESS_TOKEN_TTL`, 15 minutes by default).
- **Google sign-in** matches returning users on Google's stable `sub`, links a
  verified email to an existing password account only when that account has
  no other Google identity, and refuses unverified emails.
- **Rate limits:** failed sign-ins per IP; scans per user (or per IP when
  anonymous). `TRUST_PROXY` must equal the real number of proxies in front of
  the API, or clients could forge the IP the limiter sees.
- **Database:** row-level security is on for every table with no public
  policies; only the server's service-role key can read or write.

## Google sign-in setup

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth
   client ID** → *Web application*.
2. Authorized JavaScript origins: `http://localhost:3000` and your production
   web origin. No redirect URI is needed (popup flow).
3. Put the client ID in `GOOGLE_CLIENT_ID` here **and**
   `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `web/.env.local`. Leave it empty to turn
   Google sign-in off (the endpoint then answers 501).

## Tests

Vitest + Supertest drive the real Express app. `test/setup.ts` swaps every
repository for one in-memory database (`test/fakes/db.ts`) and stubs the
reputation services, so tests need no network, Supabase or `.env`.

- `auth.routes.test.ts` — app wiring, register/login/me/refresh/logout, suspension, error handling
- `google.routes.test.ts`, `google.lib.test.ts` — Google sign-in and ID-token verification
- `scans.routes.test.ts` — scanning, persistence, history, stats, reports
- `admin.routes.test.ts` — admin access, analytics, users, logs, keywords
- `reputation.test.ts` — VirusTotal and Safe Browsing clients, timeouts
- `rateLimit.test.ts` — per-user scan limits, X-Forwarded-For handling
- `units.test.ts` — schemas and JWT helpers
