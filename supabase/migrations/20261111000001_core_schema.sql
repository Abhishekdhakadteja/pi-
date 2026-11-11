-- ClinicEase v1 — Prompt 1: core tables, roles and Row Level Security.
-- Every table has clinic_id, id and created_at. RLS is ON for every table.

create extension if not exists pgcrypto;

-- ---------- Types ----------
create type public.user_role as enum ('attender', 'doctor', 'admin');
create type public.appt_status as enum ('booked', 'waiting', 'in_room', 'done', 'missed');
create type public.appt_source as enum ('qr', 'attender');
create type public.msg_channel as enum ('sms', 'whatsapp');

-- ---------- Clinics ----------
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid generated always as (id) stored,
  created_at timestamptz not null default now(),
  name text not null check (length(trim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  address text,
  phone text,
  slots_per_day int not null default 40 check (slots_per_day between 1 and 300),
  opening_time time not null default '09:00',
  closing_time time not null default '17:00',
  check (closing_time > opening_time)
);

-- ---------- Staff users (one row per Supabase Auth user) ----------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null,
  phone text check (phone ~ '^[6-9][0-9]{9}$'),
  email text,
  role public.user_role not null,
  active boolean not null default true
);
create unique index users_phone_unique on public.users (phone) where phone is not null;
create index users_clinic_idx on public.users (clinic_id);

-- ---------- Patients (several may share one phone: family members) ----------
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null check (length(trim(name)) between 1 and 120),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  age int check (age between 0 and 120),
  gender text check (gender in ('male', 'female', 'other')),
  address text,
  consent_given boolean not null default false,
  consent_date timestamptz,
  opted_out boolean not null default false,
  opted_out_at timestamptz,
  language text not null default 'hi' check (language in ('hi', 'en'))
);
create index patients_clinic_phone_idx on public.patients (clinic_id, phone);

-- ---------- Appointments ----------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  created_at timestamptz not null default now(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  doctor_id uuid references public.users (id) on delete set null,
  date date not null,
  slot_time time not null,
  token_number int not null check (token_number > 0),
  status public.appt_status not null default 'booked',
  source public.appt_source not null,
  created_by uuid references auth.users (id) on delete set null,
  called_at timestamptz,
  completed_at timestamptz,
  unique (clinic_id, date, token_number),
  unique (clinic_id, patient_id, date)
);
create index appointments_clinic_date_idx on public.appointments (clinic_id, date, token_number);
create index appointments_patient_idx on public.appointments (patient_id, date desc);

-- ---------- Visits (doctor notes — doctor only) ----------
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  created_at timestamptz not null default now(),
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  doctor_id uuid references public.users (id) on delete set null,
  doctor_notes text,
  diagnosis text,
  updated_at timestamptz not null default now()
);
create index visits_patient_idx on public.visits (patient_id, created_at desc);

-- ---------- Treatment courses ----------
create table public.treatment_courses (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  created_at timestamptz not null default now(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  appointment_id uuid unique references public.appointments (id) on delete set null,
  start_date date not null,
  days int not null check (days between 1 and 365),
  end_date date not null,
  next_visit_date date not null,
  -- pending -> reminded -> followed_up | booked | stopped
  reminder_status text not null default 'pending'
    check (reminder_status in ('pending', 'reminded', 'followed_up', 'booked', 'stopped'))
);
create index courses_end_idx on public.treatment_courses (end_date, reminder_status);

-- ---------- Reminders ----------
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  created_at timestamptz not null default now(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  course_id uuid references public.treatment_courses (id) on delete cascade,
  kind text not null default 'first' check (kind in ('first', 'follow_up')),
  channel public.msg_channel not null default 'sms',
  send_at timestamptz not null default now(),
  sent_at timestamptz,
  status text not null default 'queued' check (status in ('queued', 'sent', 'logged', 'failed', 'skipped')),
  opted_out boolean not null default false,
  message text,
  provider_ref text,
  error text,
  -- Never more than 2 reminders per course (one first + one follow-up).
  unique (course_id, kind)
);
create index reminders_clinic_idx on public.reminders (clinic_id, created_at desc);
create index reminders_patient_idx on public.reminders (patient_id, sent_at desc);

-- ---------- Audit log (insert only) ----------
create table public.audit_log (
  id bigint generated always as identity primary key,
  clinic_id uuid not null references public.clinics (id),
  created_at timestamptz not null default now(),
  user_id uuid,
  action text not null,
  record_table text not null,
  record_id text,
  time timestamptz not null default now(),
  details jsonb
);
create index audit_clinic_time_idx on public.audit_log (clinic_id, time desc);

-- ---------- Helper functions for RLS ----------
create or replace function public.my_clinic_id() returns uuid
language sql stable security definer set search_path = public as $$
  select clinic_id from public.users where id = auth.uid() and active
$$;

create or replace function public.my_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid() and active
$$;

revoke all on function public.my_clinic_id() from public, anon;
revoke all on function public.my_role() from public, anon;
grant execute on function public.my_clinic_id() to authenticated, service_role;
grant execute on function public.my_role() to authenticated, service_role;

-- ---------- Row Level Security ----------
alter table public.clinics enable row level security;
alter table public.users enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.visits enable row level security;
alter table public.treatment_courses enable row level security;
alter table public.reminders enable row level security;
alter table public.audit_log enable row level security;

-- Anonymous visitors get NOTHING from these tables.
revoke all on public.clinics, public.users, public.patients, public.appointments, public.visits,
  public.treatment_courses, public.reminders, public.audit_log from anon;

-- clinics
create policy clinics_select on public.clinics for select to authenticated
  using (id = public.my_clinic_id());
create policy clinics_update_admin on public.clinics for update to authenticated
  using (id = public.my_clinic_id() and public.my_role() = 'admin')
  with check (id = public.my_clinic_id());

-- users (staff)
create policy users_select on public.users for select to authenticated
  using (clinic_id = public.my_clinic_id());
create policy users_admin_write on public.users for all to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() = 'admin')
  with check (clinic_id = public.my_clinic_id() and public.my_role() = 'admin');

-- patients: all staff of the clinic
create policy patients_select on public.patients for select to authenticated
  using (clinic_id = public.my_clinic_id());
create policy patients_insert on public.patients for insert to authenticated
  with check (clinic_id = public.my_clinic_id());
create policy patients_update on public.patients for update to authenticated
  using (clinic_id = public.my_clinic_id()) with check (clinic_id = public.my_clinic_id());

-- appointments: all staff of the clinic
create policy appts_select on public.appointments for select to authenticated
  using (clinic_id = public.my_clinic_id());
create policy appts_insert on public.appointments for insert to authenticated
  with check (clinic_id = public.my_clinic_id());
create policy appts_update on public.appointments for update to authenticated
  using (clinic_id = public.my_clinic_id()) with check (clinic_id = public.my_clinic_id());

-- visits: DOCTOR ONLY (attender and admin cannot read doctor notes)
create policy visits_doctor_select on public.visits for select to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() = 'doctor');
create policy visits_doctor_insert on public.visits for insert to authenticated
  with check (clinic_id = public.my_clinic_id() and public.my_role() = 'doctor');
create policy visits_doctor_update on public.visits for update to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() = 'doctor')
  with check (clinic_id = public.my_clinic_id() and public.my_role() = 'doctor');

-- treatment courses: doctor writes; doctor and admin read (no notes in this table)
create policy courses_select on public.treatment_courses for select to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() in ('doctor', 'admin'));
create policy courses_doctor_insert on public.treatment_courses for insert to authenticated
  with check (clinic_id = public.my_clinic_id() and public.my_role() = 'doctor');
create policy courses_doctor_update on public.treatment_courses for update to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() = 'doctor')
  with check (clinic_id = public.my_clinic_id() and public.my_role() = 'doctor');

-- reminders: doctor/admin read, admin may update (opt-out). Created by the server job.
create policy reminders_select on public.reminders for select to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() in ('doctor', 'admin'));
create policy reminders_admin_update on public.reminders for update to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() = 'admin')
  with check (clinic_id = public.my_clinic_id());

-- audit_log: anyone on staff may INSERT their own entries; only admin may read; nobody may edit.
create policy audit_insert on public.audit_log for insert to authenticated
  with check (clinic_id = public.my_clinic_id() and user_id = auth.uid());
create policy audit_admin_select on public.audit_log for select to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() = 'admin');
revoke update, delete, truncate on public.audit_log from authenticated, anon;

create or replace function public.audit_log_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_log is append-only';
end $$;
create trigger audit_log_no_update before update or delete on public.audit_log
  for each row execute function public.audit_log_immutable();
create trigger audit_log_no_truncate before truncate on public.audit_log
  for each statement execute function public.audit_log_immutable();

-- ---------- Automatic audit of every CHANGE to patient records ----------
-- (Views are logged by the app; changes are logged here so nothing is missed.)
create or replace function public.audit_changes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  r := coalesce(new, old);
  insert into public.audit_log (clinic_id, user_id, action, record_table, record_id)
  values (r.clinic_id, auth.uid(), lower(tg_op), tg_table_name, r.id::text);
  return null;
end $$;

create trigger audit_patients after insert or update or delete on public.patients
  for each row execute function public.audit_changes();
create trigger audit_appointments after insert or update or delete on public.appointments
  for each row execute function public.audit_changes();
create trigger audit_visits after insert or update or delete on public.visits
  for each row execute function public.audit_changes();
create trigger audit_courses after insert or update or delete on public.treatment_courses
  for each row execute function public.audit_changes();

-- Keep visits.updated_at fresh
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
create trigger visits_touch before update on public.visits
  for each row execute function public.touch_updated_at();
