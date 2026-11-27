-- 5-minute live demo for doctors (/demo).
-- One row per demo start: used to limit starts per device/IP and to count how many doctors tried it.
-- Only the server (service role) reads or writes it; no policies = no access for app users.
create table if not exists public.demo_sessions (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  role text not null check (role in ('doctor', 'attender')),
  ip_hash text not null,
  ref text check (ref is null or length(ref) <= 40)
);
create index if not exists demo_sessions_ip_idx on public.demo_sessions (ip_hash, started_at desc);
create index if not exists demo_sessions_started_idx on public.demo_sessions (started_at desc);
alter table public.demo_sessions enable row level security;
revoke all on public.demo_sessions from anon, authenticated;
