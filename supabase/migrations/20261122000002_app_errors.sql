-- Error log for the owner: every crash on the server or in a browser leaves one short row,
-- so problems are seen on /owner before a doctor has to phone about them.
-- No patient names or phone numbers are stored (the app masks them before insert).
-- Only the service role (server code) can read or write it: RLS on, no policies.

create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source text not null check (source in ('server', 'browser')),
  path text,
  message text not null,
  digest text
);

create index if not exists app_errors_created_at_idx on public.app_errors (created_at desc);

alter table public.app_errors enable row level security;
revoke all on public.app_errors from anon, authenticated;
