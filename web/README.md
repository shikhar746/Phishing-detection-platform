# Web — AI Phishing Detection Platform

Next.js 16 frontend. It talks to the Express API in `../api` through a
same-origin `/api/*` proxy, or runs entirely on realistic mock data (demo
mode). Scoring, validation and report wording come from `@phishlens/core`,
the same package the API uses.

Setup and deployment are in the [root README](../README.md). From the repo
root: `npm run dev:web`, `npm test -w web`, `npm run build -w web`.

## Environment (`web/.env.local`)

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_USE_MOCKS` | `true` | Demo mode; `false` uses the real API |
| `API_ORIGIN` | `http://localhost:8080` | Where Next.js proxies `/api/*` (server-side only) |
| `NEXT_PUBLIC_API_URL` | empty | Leave empty to use the proxy; set only for direct browser→API calls |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | (dummy) | Same value as the API's `GOOGLE_CLIENT_ID`; empty hides the Google button outside demo mode |
| `NEXT_PUBLIC_MOCK_FAILURE_RATE` | `0` | Demo mode: share of requests that fail, to preview error states |

**Demo mode:** sign in with any email and an 8+ character password; addresses
starting with `admin` get the admin role. `locked@example.com` simulates a
failed login and `taken@example.com` a duplicate registration. "Continue with
Google" signs in a demo account. Data lives in your browser's localStorage.

## Pages

| Route | Access | What's there |
|---|---|---|
| `/` | public | Hero with URL scan box, how it works, features, stats strip, use cases, footer |
| `/login`, `/register` | public | Validated forms and Google sign-in; redirect back via `?next=` |
| `/scanner` | public | URL Scanner / Email Analyzer tabs, step-by-step loading state, result card with animated gauge |
| `/dashboard` | signed in | Stat cards, detection chart (with table view), searchable/filterable scan history |
| `/reports` | signed in | Threat summary, threats-by-pattern chart, filterable reports, CSV export |
| `/admin` | admin | Analytics, platform chart, user management, detection logs, keyword manager |

The scanner is public so the landing-page "Scan Now" works without an account;
signed-in users' scans are saved to their history. Page access is declared once
in `components/layout/routes.ts`.

## Folder structure

```
src/
  app/                       routes: (marketing), (auth), (app) groups, globals.css tokens
  components/
    ui/                      Button, Card, Field, Tabs, Dialog, RiskBadge, AsyncBoundary, …
    layout/                  AppShell, Sidebar, route-access table, PageHeader
    marketing/ auth/ scanner/ dashboard/ charts/ reports/ admin/
  context/AuthProvider.tsx   session state
  lib/
    api/client.ts            fetch wrapper: cookies, one silent refresh on 401, typed ApiError
    services/                typed service interfaces + HTTP implementations
    mock/                    demo-mode implementations of the same interfaces + seed data
    hooks/ config.ts format.ts csv.ts validation.ts (auth fields)
```

Each service (`auth`, `scans`, `reports`, `admin`) is an interface with an
HTTP and a mock implementation, chosen once from `NEXT_PUBLIC_USE_MOCKS` —
components never branch on demo mode.

## Design system

All colors are Tailwind theme tokens in `src/app/globals.css`; components use
the utilities (`bg-surface`, `text-ink`, `bg-accent`, `text-risk-high-ink` …),
never hex values.

| Token | Value | Use |
|---|---|---|
| `surface` | `#EFF3F1` | page background, light surfaces |
| `ink` | `#22333B` | text, navbar, dark sections |
| `accent` | `#5E8B7E` | links, icons, Safe state |
| `highlight` | `#C7A17A` | CTAs, badges, hover, Medium state |
| `risk-high` | `#A4524B` | High risk only (muted red) |

White text on `#5E8B7E` is 3.84:1, below WCAG AA, so primary buttons use
`accent-strong` (`#4A7468`, 5.26:1) and accent-colored text uses `accent-ink`
(`#3F665B`). Highlight CTAs use dark `ink` text (5.49:1). Risk colors always
come with an icon and a label, and the chart has a table view, so nothing
relies on color alone. Type: Fraunces, IBM Plex Sans, IBM Plex Mono.

## Tests

Vitest unit tests in `test/`: the API client (cookies, error envelope, silent
refresh incl. on page load, content types, Google exchange), route access,
CSV export safety, and auth-field validation. The analysis engine's tests live
with it in `packages/core`.
