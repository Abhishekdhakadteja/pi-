-- Doctor journey (/start, /webinar, /demo): one anonymous row per step reached, to see where doctors drop off.
-- No name, no phone: only the step, a tracking ref and a one-way hash of the visitor id. Server-only.
create table if not exists public.funnel_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  step text not null check (step ~ '^[a-z_]{2,30}$'),
  visitor text not null check (length(visitor) <= 64),
  ref text check (ref is null or length(ref) <= 40),
  plan text check (plan is null or plan in ('basic', 'pro', 'pro_max')),
  unique (visitor, step)
);
create index if not exists funnel_events_at_idx on public.funnel_events (at desc);
alter table public.funnel_events enable row level security;
revoke all on public.funnel_events from anon, authenticated;
