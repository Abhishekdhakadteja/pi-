-- ClinicEase v1 — Prompts 2, 3 and 5: slot booking, today's queue, doctor flow, live queue numbers.

-- ---------- Small helpers ----------
create or replace function public.clinic_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Kolkata')::date $$;

create or replace function public.clinic_now_time() returns time
language sql stable as $$ select (now() at time zone 'Asia/Kolkata')::time $$;

-- True for the service role (server code) or for staff of this clinic.
create or replace function public.can_act_for(p_clinic uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth.role() = 'service_role', false) or p_clinic = public.my_clinic_id()
$$;

-- Length of one slot for a clinic.
create or replace function public.slot_length(p_clinic uuid) returns interval
language sql stable security definer set search_path = public as $$
  select (closing_time - opening_time) / slots_per_day from public.clinics where id = p_clinic
$$;

-- ---------- Free slots of one day ----------
-- Token N always means the N-th slot of the day, so token order = time order.
create or replace function public.free_slots(p_clinic uuid, p_date date)
returns table (token int, slot_time time)
language plpgsql stable security definer set search_path = public as $$
declare
  c public.clinics;
  len interval;
begin
  if not public.can_act_for(p_clinic) then raise exception 'not allowed'; end if;
  select * into c from public.clinics where id = p_clinic;
  if c.id is null or p_date < public.clinic_today() then return; end if;
  len := (c.closing_time - c.opening_time) / c.slots_per_day;
  return query
    select g.n, (c.opening_time + len * (g.n - 1))::time
    from generate_series(1, c.slots_per_day) as g(n)
    where not exists (
      select 1 from public.appointments a
      where a.clinic_id = p_clinic and a.date = p_date and a.token_number = g.n
    )
    -- today: the current slot is still bookable, earlier ones are not
    and (p_date > public.clinic_today() or c.opening_time + len * g.n > public.clinic_now_time())
    order by g.n;
end $$;

-- Number of free slots per day, for a calendar.
create or replace function public.free_slot_counts(p_clinic uuid, p_from date, p_days int)
returns table (day date, free int)
language sql stable security definer set search_path = public as $$
  select d::date, (select count(*)::int from public.free_slots(p_clinic, d::date))
  from generate_series(p_from, p_from + (least(greatest(p_days, 1), 62) - 1), interval '1 day') as d
$$;

-- First day from p_from (inclusive) that still has a free slot (looks 60 days ahead).
create or replace function public.next_free_day(p_clinic uuid, p_from date)
returns date
language sql stable security definer set search_path = public as $$
  select day from public.free_slot_counts(p_clinic, p_from, 60) where free > 0 order by day limit 1
$$;

-- ---------- Book an appointment (safe against double booking) ----------
-- Returns json: { result: booked | existing | full | slot_taken | past, appointment?, next_free_day? }
create or replace function public.book_appointment(
  p_clinic uuid,
  p_patient uuid,
  p_date date,
  p_source public.appt_source,
  p_token int default null,
  p_status public.appt_status default 'booked'
) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  existing public.appointments;
  chosen int;
  chosen_time time;
  appt public.appointments;
begin
  if not public.can_act_for(p_clinic) then raise exception 'not allowed'; end if;
  if not exists (select 1 from public.patients where id = p_patient and clinic_id = p_clinic) then
    raise exception 'patient not found';
  end if;
  if p_date < public.clinic_today() then
    return jsonb_build_object('result', 'past');
  end if;

  -- one booking at a time per clinic and day
  perform pg_advisory_xact_lock(hashtext(p_clinic::text || p_date::text));

  select * into existing from public.appointments
    where clinic_id = p_clinic and patient_id = p_patient and date = p_date;
  if existing.id is not null then
    return jsonb_build_object('result', 'existing', 'appointment', to_jsonb(existing));
  end if;

  if p_token is null then
    select token, slot_time into chosen, chosen_time from public.free_slots(p_clinic, p_date) limit 1;
    if chosen is null then
      return jsonb_build_object('result', 'full', 'next_free_day', public.next_free_day(p_clinic, p_date + 1));
    end if;
  else
    select token, slot_time into chosen, chosen_time from public.free_slots(p_clinic, p_date) where token = p_token;
    if chosen is null then
      return jsonb_build_object('result', 'slot_taken');
    end if;
  end if;

  insert into public.appointments (clinic_id, patient_id, date, slot_time, token_number, status, source, created_by, doctor_id)
  values (
    p_clinic, p_patient, p_date, chosen_time, chosen, p_status, p_source, auth.uid(),
    (select id from public.users where clinic_id = p_clinic and role = 'doctor' and active order by created_at limit 1)
  )
  returning * into appt;

  return jsonb_build_object('result', 'booked', 'appointment', to_jsonb(appt));
end $$;

revoke all on function public.free_slots(uuid, date) from public, anon;
revoke all on function public.free_slot_counts(uuid, date, int) from public, anon;
revoke all on function public.next_free_day(uuid, date) from public, anon;
revoke all on function public.book_appointment(uuid, uuid, date, public.appt_source, int, public.appt_status) from public, anon;
revoke all on function public.can_act_for(uuid) from public, anon;
revoke all on function public.slot_length(uuid) from public, anon;
grant execute on function public.free_slots(uuid, date) to authenticated, service_role;
grant execute on function public.free_slot_counts(uuid, date, int) to authenticated, service_role;
grant execute on function public.next_free_day(uuid, date) to authenticated, service_role;
grant execute on function public.book_appointment(uuid, uuid, date, public.appt_source, int, public.appt_status) to authenticated, service_role;
grant execute on function public.can_act_for(uuid) to authenticated, service_role;
grant execute on function public.slot_length(uuid) to authenticated, service_role;

-- ---------- Live queue numbers (no names, no personal data) ----------
create table public.queue_status (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  created_at timestamptz not null default now(),
  date date not null,
  now_running int,
  pending_tokens int[] not null default '{}',
  done_tokens int[] not null default '{}',
  total_count int not null default 0,
  done_count int not null default 0,
  updated_at timestamptz not null default now(),
  unique (clinic_id, date)
);
alter table public.queue_status enable row level security;
-- Anyone may READ queue numbers (patients' live queue page). Nobody may write directly.
create policy queue_public_read on public.queue_status for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.queue_status from anon, authenticated;
grant select on public.queue_status to anon, authenticated;

create or replace function public.refresh_queue(p_clinic uuid, p_date date) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.queue_status as q (clinic_id, date, now_running, pending_tokens, done_tokens, total_count, done_count, updated_at)
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
      where clinic_id = p_clinic and date = p_date and status in ('done', 'missed')), '{}'),
    (select count(*) from public.appointments where clinic_id = p_clinic and date = p_date),
    (select count(*) from public.appointments where clinic_id = p_clinic and date = p_date and status = 'done'),
    now()
  on conflict (clinic_id, date) do update set
    now_running = excluded.now_running,
    pending_tokens = excluded.pending_tokens,
    done_tokens = excluded.done_tokens,
    total_count = excluded.total_count,
    done_count = excluded.done_count,
    updated_at = now();
end $$;
revoke all on function public.refresh_queue(uuid, date) from public, anon, authenticated;

create or replace function public.appointments_queue_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_queue(old.clinic_id, old.date);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.date <> old.date or new.clinic_id <> old.clinic_id) then
    perform public.refresh_queue(new.clinic_id, new.date);
  end if;
  return null;
end $$;
create trigger appointments_queue after insert or update or delete on public.appointments
  for each row execute function public.appointments_queue_trigger();

-- Realtime: staff lists and the patient live queue listen to queue_status changes.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.queue_status;
  end if;
end $$;

-- ---------- Doctor: call next / complete ----------
-- Calls the lowest waiting/booked token of today into the room. Returns the appointment id or null.
create or replace function public.call_next(p_clinic uuid) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  nxt uuid;
begin
  if public.my_role() is distinct from 'doctor' or p_clinic is distinct from public.my_clinic_id() then
    raise exception 'not allowed';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_clinic::text || public.clinic_today()::text));
  if exists (select 1 from public.appointments where clinic_id = p_clinic and date = public.clinic_today() and status = 'in_room') then
    return (select id from public.appointments where clinic_id = p_clinic and date = public.clinic_today() and status = 'in_room'
      order by called_at desc nulls last limit 1);
  end if;
  select id into nxt from public.appointments
    where clinic_id = p_clinic and date = public.clinic_today() and status in ('waiting', 'booked')
    order by token_number limit 1;
  if nxt is not null then
    update public.appointments set status = 'in_room', called_at = now(), doctor_id = auth.uid() where id = nxt;
  end if;
  return nxt;
end $$;

-- Marks one appointment done, then calls the next patient. Returns the next appointment id or null.
create or replace function public.complete_and_call_next(p_appointment uuid) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  a public.appointments;
begin
  select * into a from public.appointments where id = p_appointment;
  if a.id is null or public.my_role() is distinct from 'doctor' or a.clinic_id is distinct from public.my_clinic_id() then
    raise exception 'not allowed';
  end if;
  update public.appointments set status = 'done', completed_at = now(), doctor_id = auth.uid()
    where id = p_appointment and status in ('in_room', 'waiting', 'booked');
  return public.call_next(a.clinic_id);
end $$;

revoke all on function public.call_next(uuid) from public, anon;
revoke all on function public.complete_and_call_next(uuid) from public, anon;
grant execute on function public.call_next(uuid) to authenticated;
grant execute on function public.complete_and_call_next(uuid) to authenticated;
