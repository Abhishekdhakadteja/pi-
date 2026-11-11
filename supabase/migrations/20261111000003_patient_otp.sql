-- ClinicEase v1 — Prompt 4: one-time passwords for the public patient booking page.
-- Only the server (service role) can touch this table. Codes are stored hashed.

create table public.patient_otps (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  created_at timestamptz not null default now(),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  used_at timestamptz
);
create index patient_otps_phone_idx on public.patient_otps (phone, created_at desc);

alter table public.patient_otps enable row level security;
-- No policies on purpose: anon and staff cannot read or write OTPs.
revoke all on public.patient_otps from anon, authenticated;

-- Remember which reminder led to a booking (for the "booked after a reminder" report).
alter table public.appointments add column reminder_id uuid references public.reminders (id) on delete set null;
