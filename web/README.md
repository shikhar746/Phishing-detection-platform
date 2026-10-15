# PhishLens — AI Phishing Detection Platform (web)

Next.js frontend for the phishing detection platform. It checks URLs and email/message text with
rule-based checks (HTTPS, keywords, domain structure) plus VirusTotal and Google Safe Browsing
reputation, and returns a risk level, risk percentage, threat status and recommendation.

It runs fully on realistic **mock data** today. Every data call goes through a service in
`src/lib/services/`, so switching to the Express API in `../api` is a config change plus the
endpoints listed below.

## Run it

Requires Node 20+.

```bash
cd web
npm install
cp .env.example .env.local   # defaults to mock mode
npm run dev                  # http://localhost:3000
```

Other scripts: `npm run build`, `npm start`, `npm run lint`, `npm test`.

**Demo mode:** sign in with any email and an 8+ character password. Addresses starting with
`admin` (e.g. `admin@example.com`) get the admin role. `locked@example.com` simulates a failed
login and `taken@example.com` a duplicate registration. "Continue with Google" signs in a demo
Google account (there is no real Google popup in mock mode). Data lives in your browser's
localStorage (clear site data to reset). Set `NEXT_PUBLIC_MOCK_FAILURE_RATE=0.3` to see the
error states.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Express API base URL |
| `NEXT_PUBLIC_USE_MOCKS` | `true` | `false` sends every request to the API |
| `NEXT_PUBLIC_MOCK_FAILURE_RATE` | `0` | Mock only: share of requests that fail |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | (dummy) | Google OAuth client ID, same value as `GOOGLE_CLIENT_ID` in `api/.env`; empty hides the Google button outside mock mode |

## Pages

| Route | Access | What's there |
|---|---|---|
| `/` | public | Hero with URL scan box, how it works, features, stats strip, use cases, footer |
| `/login`, `/register` | public | Validated auth forms; redirect back via `?next=` |
| `/scanner` | public | URL Scanner / Email Analyzer tabs, step-by-step loading state, result card with animated gauge |
| `/dashboard` | signed in | Stat cards, detection chart (with table view), searchable/filterable scan history |
| `/reports` | signed in | Weekly summary, threats-by-pattern chart, filterable reports, CSV export |
| `/admin` | admin | Analytics cards, platform chart, user management, detection logs, keyword manager |

The scanner is public so the landing-page "Scan Now" works without an account. Signed-in users'
scans are saved to their history.

## Folder structure

```
src/
  app/
    layout.tsx               fonts, metadata, AuthProvider, skip link
    globals.css              design tokens (Tailwind v4 @theme)
    error.tsx, not-found.tsx
    (marketing)/             landing page + header/footer layout
    (auth)/login, register   split-screen auth layout
    (app)/                   AppShell layout (sidebar, auth guard)
      dashboard/ scanner/ reports/ admin/
  components/
    ui/                      Button, Card, Field/Input/Textarea/Select, Tabs, Dialog,
                             RiskBadge, Spinner, Logo, States (Skeleton/Empty/Error)
    motion/Reveal.tsx        scroll fade-in + hover lift
    marketing/               Hero, LinkAnatomy, HowItWorks, Features, StatsStrip, UseCases, CtaBand
    auth/AuthForm.tsx
    layout/AppShell.tsx      sidebar, mobile drawer, route guard, PageHeader
    scanner/                 Scanner, UrlScanForm, EmailScanForm, ScanProgress, ScanResultCard, RiskGauge
    dashboard/               DashboardView, StatCard, ScanHistoryTable
    charts/                  DetectionChart (stacked bars), CategoryBars
    reports/ReportsView.tsx
    admin/                   AdminView, UserManagement, KeywordManager
  context/AuthProvider.tsx   session state (login/register/logout/me)
  lib/
    analysis/                rule engine (analyzer.ts) + default keyword list — pure, portable to the API
    api/client.ts            fetch wrapper: cookies, one silent refresh on 401, typed ApiError
    services/                auth, scans, reports, admin — mock or real, same signatures
    mock/                    seed data + localStorage store
    hooks/                   useAsync, useElementWidth
    config.ts types.ts validation.ts format.ts cn.ts
```

## Design system

All colors are Tailwind theme tokens in `src/app/globals.css`. Components use the utilities
(`bg-surface`, `text-ink`, `bg-accent`, `bg-highlight`, `text-risk-high-ink` …), never hex values.

| Token | Value | Use |
|---|---|---|
| `surface` | `#EFF3F1` | page background, light surfaces |
| `ink` | `#22333B` | text, navbar, dark sections |
| `accent` | `#5E8B7E` | links, icons, Safe state |
| `highlight` | `#C7A17A` | CTAs, badges, hover, Medium state |
| `risk-high` | `#A4524B` | High risk only (muted red) |

Contrast notes: white text on `#5E8B7E` is 3.84:1, below WCAG AA for normal text, so primary
buttons use `accent-strong` (`#4A7468`, 5.26:1) and accent-colored text uses `accent-ink`
(`#3F665B`). Highlight CTAs use dark `ink` text (5.49:1). Risk colors always come with an icon and
a label, and the detection chart has a table view, so nothing relies on color alone.

Type: Fraunces (display), IBM Plex Sans (body), IBM Plex Mono (URLs and data).

## Google sign-in

`components/auth/GoogleSignInButton.tsx` loads Google Identity Services and renders Google's
official button. Its callback receives an ID token, which `authService.google()` posts to
`POST /api/auth/google`; the API verifies it and sets the session cookies. OAuth client setup is
in [../api/README.md](../api/README.md#google-sign-in).

## Tests

```bash
npm test
```

Vitest unit tests in `test/`: the rule engine (including both examples from the brief), input
validation, dashboard stat calculations, and the API client (cookies, error envelope, one silent
refresh on 401, Google exchange).

## Connecting the backend

The API provides `POST /api/auth/register | login | google | logout | refresh` and
`GET /api/auth/me` with httpOnly JWT cookies, and `src/lib/services/auth.ts` calls those as-is.
Still to build, with the contracts the frontend expects (documented at the top of each service file):

```
POST   /api/scans/url        { url }       -> { scan: ScanResult }
POST   /api/scans/email      { content }   -> { scan: ScanResult }
GET    /api/scans                          -> { scans: ScanResult[] }
GET    /api/scans/stats                    -> { stats, daily }
GET    /api/reports                        -> { reports: ThreatReport[] }
GET    /api/admin/analytics                -> { analytics, daily }
GET    /api/admin/users                    -> { users }
PATCH  /api/admin/users/:id  { role?, status? }
GET    /api/admin/logs                     -> { scans }
GET    /api/admin/keywords                 -> { keywords }
POST   /api/admin/keywords   { term, category, weight }
DELETE /api/admin/keywords/:id
```

Shapes are in `src/lib/types.ts`. Then set `NEXT_PUBLIC_USE_MOCKS=false`.
