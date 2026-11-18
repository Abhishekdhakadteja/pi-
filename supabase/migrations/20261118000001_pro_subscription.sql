-- Clinic Easy Pro subscription (2026-11-18).
-- 1. Plan columns on clinics. Only Clinic Easy itself (service role / SQL editor) can change them,
--    never a clinic admin through the app.
-- 2. start_pro_trial(): the clinic's doctor or admin starts the free 14-day Pro trial, once.
-- 3. subscription_payments: every Pro payment (Razorpay or manual), written by the server only.
-- Safe to run twice.

alter table public.clinics
  add column if not exists plan text not null default 'basic',
  add column if not exists plan_until timestamptz,
  add column if not exists pro_trial_ends_at timestamptz,
  add column if not exists pro_trial_used boolean not null default false;

do $$ begin
  alter table public.clinics add constraint clinics_plan_check check (plan in ('basic', 'pro', 'pro_max'));
exception when duplicate_object then null; end $$;

-- Clinic admins may update their clinic row (settings), but not its plan.
create or replace function public.clinics_protect_plan() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and (
       new.plan is distinct from old.plan
    or new.plan_until is distinct from old.plan_until
    or new.pro_trial_ends_at is distinct from old.pro_trial_ends_at
    or new.pro_trial_used is distinct from old.pro_trial_used) then
    raise exception 'The plan can only be changed by Clinic Easy' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.clinics_protect_plan() from public, anon, authenticated;

drop trigger if exists clinics_protect_plan on public.clinics;
create trigger clinics_protect_plan before update on public.clinics
  for each row execute function public.clinics_protect_plan();

-- Free Pro trial: once per clinic, started by its doctor or admin.
create or replace function public.start_pro_trial() returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_clinic uuid := public.my_clinic_id();
  v_end timestamptz;
begin
  if v_clinic is null or public.my_role() not in ('admin', 'doctor') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.clinics
     set pro_trial_ends_at = now() + interval '14 days', pro_trial_used = true
   where id = v_clinic and not pro_trial_used
  returning pro_trial_ends_at into v_end;
  if v_end is null then
    raise exception 'trial already used' using errcode = 'P0001';
  end if;
  insert into public.audit_log (clinic_id, user_id, action, record_table, record_id, details)
  values (v_clinic, auth.uid(), 'pro_trial_started', 'clinics', v_clinic::text, jsonb_build_object('ends', v_end));
  return v_end;
end $$;
revoke all on function public.start_pro_trial() from public, anon;
grant execute on function public.start_pro_trial() to authenticated;

-- Payments
create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  created_at timestamptz not null default now(),
  plan text not null check (plan in ('pro', 'pro_max')),
  cycle text not null check (cycle in ('month', 'year', 'first_month')),
  amount_paise int not null check (amount_paise >= 0),
  provider text not null default 'razorpay' check (provider in ('razorpay', 'manual')),
  order_id text unique,
  payment_id text unique,
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  period_end timestamptz,
  note text
);
create index if not exists subscription_payments_clinic_idx on public.subscription_payments (clinic_id, created_at desc);

alter table public.subscription_payments enable row level security;
revoke all on public.subscription_payments from anon;
revoke insert, update, delete on public.subscription_payments from authenticated;

drop policy if exists subscription_payments_select on public.subscription_payments;
create policy subscription_payments_select on public.subscription_payments for select to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() in ('admin', 'doctor'));
-- No insert/update/delete policy: only the server (service role) writes payments.
