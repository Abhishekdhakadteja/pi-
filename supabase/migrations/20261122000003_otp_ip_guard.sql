-- OTP abuse guard: remember a one-way hash of the sender's IP (never the IP itself), so the
-- booking page can limit how many OTP SMS one device/network can trigger.
alter table public.patient_otps add column if not exists ip_hash text;
create index if not exists patient_otps_ip_idx on public.patient_otps (ip_hash, created_at desc) where ip_hash is not null;
create index if not exists patient_otps_clinic_idx on public.patient_otps (clinic_id, created_at desc);
