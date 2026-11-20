-- Doctor self sign-up (2026-11-20).
-- 1. New clinic details asked at sign-up: city, specialty, NMC/State council registration number,
--    and "show my clinic in the patient doctor-finder" (public_listing, off by default).
-- 2. signup_status: 'pending' until the doctor verifies the OTP (or the Clinic Easy team approves
--    on /owner). Every clinic that already exists stays 'active'.
-- 3. signup_otps: hashed one-time codes for sign-up. Only the server (service role) can touch it.
-- Safe to run twice.

alter table public.clinics
  add column if not exists city text,
  add column if not exists specialty text,
  add column if not exists specialty_other text,
  add column if not exists doctor_reg_no text,
  add column if not exists public_listing boolean not null default false,
  add column if not exists signup_status text not null default 'active',
  add column if not exists signup_source text not null default 'owner';

do $$ begin
  alter table public.clinics add constraint clinics_city_len check (city is null or char_length(city) between 2 and 60);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.clinics add constraint clinics_specialty_key check (specialty is null or specialty ~ '^[a-z_]{2,30}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.clinics add constraint clinics_specialty_other_len check (specialty_other is null or char_length(specialty_other) <= 60);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.clinics add constraint clinics_reg_no_len check (doctor_reg_no is null or char_length(doctor_reg_no) <= 30);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.clinics add constraint clinics_signup_status_check check (signup_status in ('pending', 'active'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.clinics add constraint clinics_signup_source_check check (signup_source in ('owner', 'self'));
exception when duplicate_object then null; end $$;

-- For the future doctor-finder: "skin doctors in Guna".
create index if not exists clinics_finder_idx on public.clinics (lower(city), specialty) where public_listing and signup_status = 'active';
create index if not exists clinics_pending_idx on public.clinics (created_at) where signup_status = 'pending';

create table if not exists public.signup_otps (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  created_at timestamptz not null default now(),
  channel text not null check (channel in ('email', 'mobile')),
  target text not null check (char_length(target) between 5 and 120),
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  used_at timestamptz
);
create index if not exists signup_otps_clinic_idx on public.signup_otps (clinic_id, created_at desc);

alter table public.signup_otps enable row level security;
-- No policies on purpose: browsers and staff can never read or write sign-up codes.
revoke all on public.signup_otps from anon, authenticated;
