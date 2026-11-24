-- "Forgot password" (2026-11-24).
-- password_reset_otps: one row for every reset request, even when no login matches what was typed,
-- so the rate limits work the same for everyone and the page never reveals who has an account.
--  - id_hash: one-way hash of the mobile/email typed (never stored in plain text)
--  - ip_hash: one-way hash of the visitor's IP (never the IP itself)
--  - user_id / target / code_hash: only filled when a login matched and an email was sent
-- Codes are hashed, expire in 10 minutes, allow 5 tries and work once. Only the server can touch it.
-- Safe to run twice.

do $$ begin
  create table if not exists public.password_reset_otps (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    id_hash text not null check (char_length(id_hash) between 16 and 128),
    ip_hash text,
    user_id uuid references auth.users (id) on delete cascade,
    target text check (target is null or char_length(target) between 5 and 120),
    code_hash text,
    expires_at timestamptz not null,
    attempts int not null default 0,
    used_at timestamptz
  );
end $$;

create index if not exists password_reset_otps_id_idx on public.password_reset_otps (id_hash, created_at desc);
create index if not exists password_reset_otps_ip_idx on public.password_reset_otps (ip_hash, created_at desc) where ip_hash is not null;
create index if not exists password_reset_otps_user_idx on public.password_reset_otps (user_id) where user_id is not null;

alter table public.password_reset_otps enable row level security;
-- No policies on purpose: browsers and staff can never read or write reset codes.
revoke all on public.password_reset_otps from anon, authenticated;
