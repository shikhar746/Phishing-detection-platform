# API — AI Phishing Detection Platform

Express 5 + TypeScript API. Auth uses httpOnly JWT cookies (access + rotating refresh token),
email/password or Google sign-in, with users stored in Supabase Postgres.

## Setup

```bash
cd api
npm install
cp .env.example .env     # then replace the dummy values
npm run dev              # http://localhost:8080
```

1. Create a Supabase project and run [`infra/schema.sql`](infra/schema.sql) in its SQL editor.
2. Put the project URL and **service-role** key in `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`.
3. Generate `JWT_SECRET` and `REFRESH_SECRET` (two different long random strings).
4. To make yourself an admin after registering:
   `update public.users set role = 'admin' where email = 'you@example.com';`

Scripts: `npm run dev`, `npm run build`, `npm start`, `npm run typecheck`, `npm test`.

## Google sign-in

The web app uses Google Identity Services: Google's button gives the browser an **ID token**,
the browser posts it to `POST /api/auth/google`, and the API verifies it with
`google-auth-library` against `GOOGLE_CLIENT_ID` before starting a session.

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** → *Web application*.
2. Authorized JavaScript origins: `http://localhost:3000` (plus your production web origin).
   No redirect URI is needed for this popup flow.
3. Put the client ID in `GOOGLE_CLIENT_ID` here **and** `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `web/.env.local`.

Account matching: a returning user is matched on Google's stable `sub`; a Google-verified email
that already has a password account is linked to it; otherwise a new account is created.
Unverified Google emails are refused. Leave `GOOGLE_CLIENT_ID` empty to turn Google sign-in off
(the endpoint then answers 501). `GOOGLE_CLIENT_SECRET` isn't needed for this flow.

## Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/health` | — | liveness check |
| POST | `/api/auth/register` | — | `{ name, email, password }` → 201 `{ user }` + cookies |
| POST | `/api/auth/login` | — | `{ email, password }` → `{ user }` + cookies |
| POST | `/api/auth/google` | — | `{ credential }` (Google ID token) → `{ user }` + cookies |
| POST | `/api/auth/refresh` | refresh cookie | rotates both tokens |
| POST | `/api/auth/logout` | — | clears cookies |
| GET | `/api/auth/me` | access cookie | current `{ user }` |
| GET | `/api/users/lookup?email=` | access cookie | exact-address lookup |

Errors always use `{ "error": { "code", "message", "issues?" } }`. Register, login and Google
are rate-limited on failed attempts (`RATE_LIMIT_MAX` per `RATE_LIMIT_WINDOW_MINUTES`).

## Tests

```bash
npm test
```

Vitest + Supertest drive the real Express app. The database layer
(`src/repositories/users.repo.ts`) is swapped for an in-memory fake (`test/fakes/usersRepo.ts`) and
Google verification is mocked, so tests need no network, Supabase project or `.env` — test-only
values come from `vitest.config.ts`.

- `test/auth.routes.test.ts` — app wiring (CORS, headers, 404), register, login, me, refresh, logout
- `test/google.routes.test.ts` — Google sign-in: disabled, invalid token, new user, returning user, account linking
- `test/google.lib.test.ts` — ID-token verification rules (audience, verified email, fallbacks)
- `test/users.routes.test.ts` — user lookup
- `test/units.test.ts` — validation schemas and JWT helpers
