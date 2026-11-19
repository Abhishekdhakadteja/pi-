-- Clinic Easy Pro automation (2026-11-19).
-- 1. clinics.ai_knowledge: the clinic's own notes that the AI मैनेजर reads (timings, fees, rules,
--    FAQ). This is how a clinic "teaches" its AI. Nothing here trains any AI model.
-- 2. Staff tracking with ESP32 presence nodes and BLE tags (Beta):
--    presence_nodes          one row per ESP32 device in a clinic (token stored only as a hash)
--    staff_devices           which BLE tag / phone / watch belongs to which staff member
--    staff_presence_events   "tag X was seen by node Y at time T" (written by the server only)
-- Clinic admins read and manage their own clinic's rows. Events are inserted only by the
-- server's /api/presence endpoint (service role), never directly from a browser or a device.
-- Safe to run twice.

alter table public.clinics add column if not exists ai_knowledge text;
do $$ begin
  alter table public.clinics add constraint clinics_ai_knowledge_len check (ai_knowledge is null or char_length(ai_knowledge) <= 4000);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- presence nodes (ESP32)
create table if not exists public.presence_nodes (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  token_hash text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  last_ip text,
  firmware text
);
create index if not exists presence_nodes_clinic_idx on public.presence_nodes (clinic_id);

-- ---------------------------------------------------------------- staff devices (tags, phones, watches)
create table if not exists public.staff_devices (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null default 'ble_tag' check (kind in ('ble_tag', 'phone', 'watch')),
  -- normalised identifier: a BLE MAC "aa:bb:cc:dd:ee:ff" or an iBeacon "uuid:major:minor"
  identifier text not null check (char_length(identifier) between 3 and 80),
  label text check (label is null or char_length(label) <= 60),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (clinic_id, identifier)
);
create index if not exists staff_devices_user_idx on public.staff_devices (user_id);

-- ---------------------------------------------------------------- sightings
create table if not exists public.staff_presence_events (
  id bigint generated always as identity primary key,
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  node_id uuid references public.presence_nodes (id) on delete set null,
  seen_at timestamptz not null default now(),
  rssi smallint
);
create index if not exists staff_presence_events_day_idx on public.staff_presence_events (clinic_id, seen_at desc);
create index if not exists staff_presence_events_user_idx on public.staff_presence_events (user_id, seen_at desc);

-- ---------------------------------------------------------------- row level security
alter table public.presence_nodes enable row level security;
alter table public.staff_devices enable row level security;
alter table public.staff_presence_events enable row level security;

revoke all on public.presence_nodes, public.staff_devices, public.staff_presence_events from anon;
-- Node tokens are created by the server (service role); admins never insert them directly.
revoke insert on public.presence_nodes from authenticated;
revoke insert, update, delete on public.staff_presence_events from authenticated;

drop policy if exists presence_nodes_admin_read on public.presence_nodes;
create policy presence_nodes_admin_read on public.presence_nodes for select to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() = 'admin');
drop policy if exists presence_nodes_admin_update on public.presence_nodes;
create policy presence_nodes_admin_update on public.presence_nodes for update to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() = 'admin')
  with check (clinic_id = public.my_clinic_id());

drop policy if exists staff_devices_admin_all on public.staff_devices;
create policy staff_devices_admin_all on public.staff_devices for all to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() = 'admin')
  with check (clinic_id = public.my_clinic_id() and public.my_role() = 'admin');
-- staff can see their own tag (transparency)
drop policy if exists staff_devices_own_read on public.staff_devices;
create policy staff_devices_own_read on public.staff_devices for select to authenticated
  using (user_id = auth.uid());

drop policy if exists presence_events_admin_read on public.staff_presence_events;
create policy presence_events_admin_read on public.staff_presence_events for select to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() = 'admin');
-- staff can see their own record (transparency, DPDP)
drop policy if exists presence_events_own_read on public.staff_presence_events;
create policy presence_events_own_read on public.staff_presence_events for select to authenticated
  using (user_id = auth.uid());

-- Keep only 90 days of raw sightings (run by hand or from a cron; daily totals are computed in the app).
create or replace function public.prune_presence_events() returns int
language sql security definer set search_path = public as $$
  with d as (delete from public.staff_presence_events where seen_at < now() - interval '90 days' returning 1)
  select count(*)::int from d;
$$;
revoke all on function public.prune_presence_events() from public, anon, authenticated;
