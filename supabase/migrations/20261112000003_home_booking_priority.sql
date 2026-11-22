-- ClinicEase v2.2: book from home through the reminder link, and be called first.
--   * clinics.home_priority: patients who booked from home, have arrived and whose time has come
--     are called before walk-in patients. Patients who have not arrived no longer block the line.
--   * reminders.link_attempts: wrong tries of "last 4 digits" on a personal reminder link (max 5).
--   * queue_status.home_tokens: pending tokens booked from home (numbers only, for the live queue page).
-- Safe to run more than once.

alter table public.clinics add column if not exists home_priority boolean not null default true;
alter table public.reminders add column if not exists link_attempts int not null default 0;
alter table public.queue_status add column if not exists home_tokens int[] not null default '{}';

-- ---------- Live queue numbers: also publish which pending tokens were booked from home ----------
create or replace function public.refresh_queue(p_clinic uuid, p_date date) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.queue_status as q (clinic_id, date, now_running, pending_tokens, done_tokens, home_tokens, total_count, done_count, updated_at)
  select
    p_clinic,
    p_date,
    coalesce(
      (select token_number from public.appointments where clinic_id = p_clinic and date = p_date and status = 'in_room'
        order by called_at desc nulls last limit 1),
      (select token_number from public.appointments where clinic_id = p_clinic and date = p_date and called_at is not null
        order by called_at desc limit 1)
    ),
    coalesce((select array_agg(token_number order by token_number) from public.appointments
      where clinic_id = p_clinic and date = p_date and status in ('booked', 'waiting')), '{}'),
    coalesce((select array_agg(token_number order by token_number) from public.appointments
      where clinic_id = p_clinic and date = p_date and status = 'done'), '{}'),
    case when (select home_priority from public.clinics where id = p_clinic) then
      coalesce((select array_agg(token_number order by token_number) from public.appointments
        where clinic_id = p_clinic and date = p_date and status in ('booked', 'waiting') and source = 'qr'), '{}')
    else '{}'::int[] end,
    (select count(*) from public.appointments where clinic_id = p_clinic and date = p_date),
    (select count(*) from public.appointments where clinic_id = p_clinic and date = p_date and status = 'done'),
    now()
  on conflict (clinic_id, date) do update set
    now_running = excluded.now_running,
    pending_tokens = excluded.pending_tokens,
    done_tokens = excluded.done_tokens,
    home_tokens = excluded.home_tokens,
    total_count = excluded.total_count,
    done_count = excluded.done_count,
    updated_at = now();
end $$;
revoke all on function public.refresh_queue(uuid, date) from public, anon, authenticated;

-- ---------- Doctor: call next ----------
-- home_priority off: lowest token first (as before).
-- home_priority on:
--   1. booked from home + arrived + their time has come (10 minutes early is fine), lowest token first
--   2. everyone else who has arrived, lowest token first
--   3. booked from home but not marked as arrived yet, lowest token first
create or replace function public.call_next(p_clinic uuid) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  nxt uuid;
  prio boolean;
begin
  if public.my_role() is distinct from 'doctor' or p_clinic is distinct from public.my_clinic_id() then
    raise exception 'not allowed';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_clinic::text || public.clinic_today()::text));
  if exists (select 1 from public.appointments where clinic_id = p_clinic and date = public.clinic_today() and status = 'in_room') then
    return (select id from public.appointments where clinic_id = p_clinic and date = public.clinic_today() and status = 'in_room'
      order by called_at desc nulls last limit 1);
  end if;
  select home_priority into prio from public.clinics where id = p_clinic;
  select id into nxt from public.appointments a
    where a.clinic_id = p_clinic and a.date = public.clinic_today() and a.status in ('waiting', 'booked')
    order by
      case
        when not coalesce(prio, false) then 0
        when a.source = 'qr' and a.status = 'waiting'
          and a.slot_time <= (now() at time zone 'Asia/Kolkata')::time + interval '10 minutes' then 0
        when a.status = 'waiting' then 1
        else 2
      end,
      a.token_number
    limit 1;
  if nxt is not null then
    update public.appointments set status = 'in_room', called_at = now(), doctor_id = auth.uid() where id = nxt;
  end if;
  return nxt;
end $$;
revoke all on function public.call_next(uuid) from public, anon;
grant execute on function public.call_next(uuid) to authenticated;

-- ---------- Reminder wording: tell the patient that booking from home saves waiting ----------
-- Only clinics that still use the original wording are changed. Edited wording is left alone.
alter table public.clinics alter column reminder_template_hi set default
  'Namaste {patient}, {clinic} se Dr. {doctor} ka sandesh: aapka course poora hone wala hai. Ghar baithe apna number lagayein aur clinic par line me lagne se bachein: {link}. Band karne ke liye STOP likhein.';
alter table public.clinics alter column reminder_template_en set default
  'Hello {patient}, a message from Dr. {doctor} at {clinic}: your course is about to end. Book your number from home and skip the waiting line at the clinic: {link}. Reply STOP to stop messages.';

update public.clinics set reminder_template_hi =
  'Namaste {patient}, {clinic} se Dr. {doctor} ka sandesh: aapka course poora hone wala hai. Ghar baithe apna number lagayein aur clinic par line me lagne se bachein: {link}. Band karne ke liye STOP likhein.'
where reminder_template_hi =
  'Namaste {patient}, {clinic} se Dr. {doctor} ka sandesh: aapka course poora hone wala hai. Ilaaj beech me na ruke, kripya jaldi milne ka time book karein: {link}. Band karne ke liye STOP likhein.';

update public.clinics set reminder_template_en =
  'Hello {patient}, a message from Dr. {doctor} at {clinic}: your course is about to end. Book your number from home and skip the waiting line at the clinic: {link}. Reply STOP to stop messages.'
where reminder_template_en =
  'Hello {patient}, a message from Dr. {doctor} at {clinic}: your course is about to end. So your treatment is not interrupted, please book your visit here: {link}. Reply STOP to stop messages.';

-- Fill home_tokens for today's queues.
select public.refresh_queue(clinic_id, date) from public.queue_status where date >= public.clinic_today();
