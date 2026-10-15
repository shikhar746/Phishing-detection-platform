-- Supabase / Postgres schema for the phishing detection platform.
-- Run in the Supabase SQL editor (or psql) once per project; it is safe to
-- re-run. Then seed the keyword list with `npm run seed -w api`.

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
  user_id         uuid not null references public.users (id) on delete cascade,
  scan_type       text not null check (scan_type in ('url', 'email')),
  content         text not null,
  risk_level      text not null check (risk_level in ('low', 'medium', 'high')),
  risk_score      smallint not null check (risk_score between 0 and 100),
  threat_status   text not null,
  recommendation  text not null,
  -- full result: { checks: CheckResult[], reputation: ReputationResult[] }
  result          jsonb not null,
  created_at      timestamptz not null default now()
);
create index if not exists scan_history_user_created_idx on public.scan_history (user_id, created_at desc);
create index if not exists scan_history_created_idx on public.scan_history (created_at desc);

-- Threat reports: one row per medium/high scan ----------------------------
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  scan_id      uuid not null unique references public.scan_history (id) on delete cascade,
  report_type  text not null default 'scan' check (report_type in ('scan')),
  category     text not null check (category in (
                 'credential-harvesting', 'brand-impersonation', 'urgency-scam',
                 'malicious-reputation', 'insecure-transport')),
  risk_level   text not null check (risk_level in ('medium', 'high')),
  title        text not null,
  details      text not null,
  created_at   timestamptz not null default now()
);
create index if not exists reports_user_created_idx on public.reports (user_id, created_at desc);

-- Suspicious keywords (managed by admins) --------------------------------
create table if not exists public.keywords (
  id          uuid primary key default gen_random_uuid(),
  term        text not null,
  category    text not null check (category in ('url', 'brand', 'urgency', 'threat', 'credential', 'scam')),
  weight      smallint not null check (weight between 1 and 50),
  created_at  timestamptz not null default now(),
  unique (term, category)
);

-- Saving a scan: the scan and (when flagged) its report in one transaction,
-- so a flagged scan can never exist without its report.
create or replace function public.record_scan(p_scan jsonb, p_report jsonb default null)
returns public.scan_history
language plpgsql
as $$
declare
  saved public.scan_history;
begin
  insert into public.scan_history (user_id, scan_type, content, risk_level, risk_score, threat_status, recommendation, result)
  values (
    (p_scan->>'user_id')::uuid,
    p_scan->>'scan_type',
    p_scan->>'content',
    p_scan->>'risk_level',
    (p_scan->>'risk_score')::smallint,
    p_scan->>'threat_status',
    p_scan->>'recommendation',
    p_scan->'result'
  )
  returning * into saved;

  if p_report is not null then
    insert into public.reports (user_id, scan_id, category, risk_level, title, details)
    values (saved.user_id, saved.id, p_report->>'category', saved.risk_level, p_report->>'title', p_report->>'details');
  end if;

  return saved;
end;
$$;

-- Admin user list: account fields plus scan count and last activity.
create or replace view public.admin_user_overview
with (security_invoker = true) as
select
  u.id, u.email, u.name, u.role, u.status, u.created_at,
  count(s.id)::int                         as scans,
  coalesce(max(s.created_at), u.created_at) as last_active
from public.users u
left join public.scan_history s on s.user_id = u.id
group by u.id;

-- The API connects with the service-role key and does its own authorization,
-- so lock every table, view and function against the public anon key.
alter table public.users        enable row level security;
alter table public.scan_history enable row level security;
alter table public.reports      enable row level security;
alter table public.keywords     enable row level security;
revoke all on public.admin_user_overview from anon, authenticated;
revoke execute on function public.record_scan(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.record_scan(jsonb, jsonb) to service_role;

-- Make yourself an admin after registering:
-- update public.users set role = 'admin' where email = 'you@example.com';
