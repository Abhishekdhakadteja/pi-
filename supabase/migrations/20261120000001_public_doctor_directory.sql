-- Public doctor finder (/health/doctors): a clinic can choose to appear in the public list
-- so common people can find it by city + specialty and book online.
-- Off by default: nothing is shown until the clinic admin ticks "show my clinic".
-- Read only by server code (service role) and only these columns + slug/name/address.

alter table public.clinics
  add column if not exists city text,
  add column if not exists specialty text,
  add column if not exists doctor_name text,
  add column if not exists public_listed boolean not null default false;

do $$
begin
  alter table public.clinics add constraint clinics_city_len check (city is null or char_length(city) between 1 and 40);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.clinics add constraint clinics_doctor_name_len check (doctor_name is null or char_length(doctor_name) between 1 and 120);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.clinics add constraint clinics_specialty_check check (
    specialty is null or specialty in (
      'general', 'ortho', 'cardio', 'skin', 'dental', 'gynae', 'child', 'ent',
      'eye', 'neuro', 'gastro', 'chest', 'diabetes', 'kidney', 'mind', 'physio'
    )
  );
exception when duplicate_object then null;
end $$;

create index if not exists clinics_public_city_idx on public.clinics (lower(city), specialty) where public_listed;
