-- Supabase / Postgres schema for the phishing detection platform.
-- Run in the Supabase SQL editor (or psql) once per project.

create extension if not exists "pgcrypto";

-- Users -----------------------------------------------------------------
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  name          text not null,
  -- null for accounts that only sign in with Google
  password_hash text,
  -- Google's stable "sub" claim; unique when present
  google_id     text unique,
  image_url     text,
  role          text not null default 'user' check (role in ('user', 'admin')),
  status        text not null default 'active' check (status in ('active', 'suspended')),
  created_at    timestamptz not null default now()
);

-- Scan history ----------------------------------------------------------
create table if not exists public.scan_history (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.users (id) on delete cascade,
  scan_type       text not null check (scan_type in ('url', 'email')),
  content         text not null,
  risk_level      text not null check (risk_level in ('low', 'medium', 'high')),
  risk_score      smallint not null check (risk_score between 0 and 100),
  threat_status   text not null,
  recommendation  text not null,
  -- full result: per-check details and reputation responses
  result          jsonb not null,
  created_at      timestamptz not null default now()
);
create index if not exists scan_history_user_created_idx on public.scan_history (user_id, created_at desc);

-- Threat reports --------------------------------------------------------
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.users (id) on delete cascade,
  scan_id      uuid references public.scan_history (id) on delete set null,
  report_type  text not null check (report_type in ('scan', 'summary')),
  category     text not null,
  risk_level   text not null check (risk_level in ('low', 'medium', 'high')),
  details      text not null,
  created_at   timestamptz not null default now()
);

-- Suspicious keywords (managed by admins) --------------------------------
create table if not exists public.keywords (
  id          uuid primary key default gen_random_uuid(),
  term        text not null,
  category    text not null check (category in ('url', 'brand', 'urgency', 'threat', 'credential', 'scam')),
  weight      smallint not null check (weight between 1 and 50),
  created_at  timestamptz not null default now(),
  unique (term, category)
);

-- The API connects with the service-role key and does its own authorization,
-- so lock every table against the public anon key.
alter table public.users        enable row level security;
alter table public.scan_history enable row level security;
alter table public.reports      enable row level security;
alter table public.keywords     enable row level security;

-- Make yourself an admin after registering:
-- update public.users set role = 'admin' where email = 'you@example.com';
