# PhishLens — AI Phishing Detection Platform

🌐 **Live demo (frontend):** [phishing-detection-platform-kappa.vercel.app](https://phishing-detection-platform-kappa.vercel.app)

⚙️ **Live API (backend):** [phishlens-api-hmuj.onrender.com](https://phishlens-api-hmuj.onrender.com)

> The API runs on Render's free tier, so the first request after a period of inactivity can take up to a minute while it wakes up.

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
                MongoDB (Mongoose), JWT cookies, Google sign-in.
web/            Next.js 16 app (landing, scanner, dashboard, reports, admin).
                Proxies /api/* to the API; also runs fully on mock data.
render.yaml     Render blueprint for the API.
```

npm workspaces tie them together: one `npm install` at the root, and both
apps import the same analysis engine, so the API and the browser can never
score a link differently.

```
Browser ──► web (Next.js) ──/api/* proxy──► api (Express) ──► MongoDB
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

1. **Database.** Either run a local MongoDB with `npm run db:local` (no
   install needed; data is kept in `api/.mongo-data`), or create a free
   [MongoDB Atlas](https://www.mongodb.com/atlas) cluster and copy its
   connection string. Collections and indexes are created automatically.
2. **API config.** `cp api/.env.example api/.env` and set `MONGODB_URI`,
   two random JWT secrets, and optionally the Google,
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

If a `mongodb+srv://` URI fails locally with `querySrv ECONNREFUSED` (some
VPN / Cloudflare WARP setups), set `DNS_SERVERS=1.1.1.1,8.8.8.8` in `api/.env`.

Without VirusTotal / Safe Browsing keys, scans still work and say the services
are not configured; the rule-based checks decide the score on their own.

## Scripts (from the repo root)

| Command | What it does |
|---|---|
| `npm run dev:web` / `npm run dev:api` | Run one app in watch mode |
| `npm run db:local` | Run a local MongoDB on port 27017 (no install needed) |
| `npm test` | Core, API and web test suites |
| `npm run typecheck` | Type-check everything |
| `npm run build` | Build core, API and web |
| `npm run seed` | Seed the keyword list (`-- --admin <email>` to promote an account) |

## Deploying

**API → Render.** New Blueprint from this repo; Render reads `render.yaml`.
Fill in the `sync: false` variables (MongoDB, Google, VirusTotal, Safe
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

On Atlas, allow Render under **Network Access** (Render's outbound IPs, or
`0.0.0.0/0`). `TRUST_PROXY=2` in `render.yaml` assumes exactly that chain (Vercel proxy →
Render load balancer → API). If you call the API directly instead, use `1`.

## Issues found and fixed

Problems a code review turned up after the move to MongoDB, and what was done
about each. Every fix has a regression test.

| # | Issue | Impact | Fix |
|---|---|---|---|
| 1 | Reputation hits only added 10–12 points to the score | A page Google lists as phishing (and 13 vendors flag) scored **Medium 42%**; a clean-looking phishing URL could even show **Low / Safe to Visit** | A Safe Browsing match now sets a minimum score of 85 and a VirusTotal detection a minimum of 65, so both always rate **High** |
| 2 | Startup ran `syncIndexes()` on every model | Each restart or deploy **dropped indexes added by hand in Atlas** (e.g. from the Performance Advisor) and rebuilt them before serving traffic | Startup uses `createIndexes()`, which only adds missing indexes |
| 3 | User ids from tokens were turned into ObjectIds without checking | A token whose id wasn't a MongoDB id (e.g. issued before the migration) caused **500 errors** on history, stats, reports and scans instead of a sign-in prompt | The auth middleware rejects such tokens with **401**, so the client refreshes or signs in again |
| 4 | Scans only checked the token, not the account | **Suspended or deleted users could keep scanning** (and using quota) until their token expired | Every signed-in request loads the account; suspended accounts get **403**, deleted ones **401**, immediately |
| 5 | Shutdown waited on `server.close()` | Open keep-alive connections could **hang the shutdown** on deploys until the host force-killed it, without closing the database pool | Idle connections are closed at once, with a 10-second fallback that closes the rest and the pool |
| 6 | The admin user list grouped the entire scans collection | **Admin page got slower as total scans grew** | Scan count and last activity are counters on each user, updated when a scan is saved |
| 7 | Analytics loaded every keyword just to count them | Wasted reads on every admin dashboard load | Uses `countDocuments()` |

Also found earlier and fixed: Node failing to resolve `mongodb+srv://` behind
Cloudflare WARP (`querySrv ECONNREFUSED`), handled by the optional
`DNS_SERVERS` setting.

## More detail

- [api/README.md](api/README.md) — endpoints, auth, security model, tests
- [web/README.md](web/README.md) — pages, design system, demo mode
