# PhishLens — AI Phishing Detection Platform

Check whether a URL, email or message is safe or phishing. Every scan runs
rule-based checks (HTTPS, keywords, domain structure, look-alike tricks) and,
for URLs, asks **VirusTotal** and **Google Safe Browsing**. You get a risk
level, a risk percentage, a threat status and a recommendation, plus every
reason behind the score.

```
http://secure-paypal-login-free.com  →  HIGH · 94% · Suspicious Website · Avoid Visiting
```

## Repository layout

```
packages/core   @phishlens/core — shared domain model: types, the rule engine,
                validation, stats and report building. Used by both apps.
api/            Express 5 + TypeScript REST API (auth, scans, reports, admin),
                Supabase Postgres, JWT cookies, Google sign-in.
web/            Next.js 16 app (landing, scanner, dashboard, reports, admin).
                Proxies /api/* to the API; also runs fully on mock data.
render.yaml     Render blueprint for the API.
```

npm workspaces tie them together: one `npm install` at the root, and both
apps import the same analysis engine, so the API and the browser can never
score a link differently.

```
Browser ──► web (Next.js) ──/api/* proxy──► api (Express) ──► Supabase Postgres
                                               └──► VirusTotal, Google Safe Browsing
```

## Quick start (demo, no backend)

Requires Node 22.12+.

```bash
npm install
npm run dev:web        # http://localhost:3000
```

`web/.env.local` defaults to demo mode: everything works with realistic mock
data kept in your browser. Sign in with any email and an 8+ character
password; addresses starting with `admin` get the admin dashboard.

## Full setup (real backend)

1. **Database.** Create a [Supabase](https://supabase.com) project and run
   [`api/infra/schema.sql`](api/infra/schema.sql) in its SQL editor.
2. **API config.** `cp api/.env.example api/.env` and fill in the Supabase URL
   and service-role key, two random JWT secrets, and optionally the Google,
   VirusTotal and Safe Browsing keys (see the comments in the file).
3. **Seed keywords:** `npm run seed`
4. **Web config.** In `web/.env.local` set `NEXT_PUBLIC_USE_MOCKS=false`.
5. **Run both:**

   ```bash
   npm run dev:api        # http://localhost:8080
   npm run dev:web        # http://localhost:3000
   ```

6. Register in the app, then make yourself an admin:
   `npm run seed -- --admin you@example.com`

Without VirusTotal / Safe Browsing keys, scans still work and say the services
are not configured; the rule-based checks decide the score on their own.

## Scripts (from the repo root)

| Command | What it does |
|---|---|
| `npm run dev:web` / `npm run dev:api` | Run one app in watch mode |
| `npm test` | Core, API and web test suites |
| `npm run typecheck` | Type-check everything |
| `npm run build` | Build core, API and web |
| `npm run seed` | Seed the keyword list (`-- --admin <email>` to promote an account) |

## Deploying

**API → Render.** New Blueprint from this repo; Render reads `render.yaml`.
Fill in the `sync: false` variables (Supabase, Google, VirusTotal, Safe
Browsing). JWT secrets are generated for you.

**Web → Vercel.** Import the repo with **Root Directory = `web`** (Vercel
installs the workspace from the repo root). Environment variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_USE_MOCKS` | `false` |
| `API_ORIGIN` | your Render URL, e.g. `https://phishlens-api.onrender.com` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | same as the API's `GOOGLE_CLIENT_ID` |

Because the web app proxies `/api/*`, the browser only ever talks to your
Vercel domain and the auth cookies are first-party — no third-party-cookie
problems in Safari or Chrome. Add the Vercel domain to the Google OAuth
client's **Authorized JavaScript origins**.

`TRUST_PROXY=2` in `render.yaml` assumes exactly that chain (Vercel proxy →
Render load balancer → API). If you call the API directly instead, use `1`.

## More detail

- [api/README.md](api/README.md) — endpoints, auth, security model, tests
- [web/README.md](web/README.md) — pages, design system, demo mode
