-- Public doctor finder (/health/doctors), 2026-11-22.
-- Uses the columns that 20261120000001_doctor_signup.sql already added
-- (city, specialty, public_listing, signup_status). This only adds the doctor's display name.
-- Safe to run twice. Adds no constraint that old rows could break.

alter table public.clinics
  add column if not exists doctor_name text;

do $$ begin
  alter table public.clinics add constraint clinics_doctor_name_len
    check (doctor_name is null or char_length(doctor_name) between 1 and 120);
exception when duplicate_object then null; end $$;
