-- ClinicEase security tests (Prompt 8). Run with:  npx supabase test db
-- Everything runs inside one transaction and is rolled back: no data is left behind.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

-- ---------- Fixed test data: two clinics, staff in each ----------
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'att-a@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', 'doc-a@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a3', 'adm-a@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b1', 'att-b@test.local', 'authenticated', 'authenticated');

insert into public.clinics (id, name, slug, slots_per_day, opening_time, closing_time) values
  ('00000000-0000-0000-0000-00000000c11a', 'Test Clinic A', 'test-a', 2, '09:00', '10:00'),
  ('00000000-0000-0000-0000-00000000c11b', 'Test Clinic B', 'test-b', 10, '09:00', '17:00');

insert into public.users (id, clinic_id, name, role) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000c11a', 'Att A', 'attender'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000c11a', 'Doc A', 'doctor'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-00000000c11a', 'Adm A', 'admin'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c11b', 'Att B', 'attender');

insert into public.patients (id, clinic_id, name, phone, consent_given) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000c11a', 'Patient One', '9811111111', true),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000c11a', 'Patient Two', '9811111111', true),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-00000000c11a', 'Patient Three', '9822222222', true);

insert into public.appointments (id, clinic_id, patient_id, date, slot_time, token_number, status, source) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000c11a', '00000000-0000-0000-0000-0000000000f1',
   public.clinic_today() - 1, '09:00', 1, 'done', 'attender');

insert into public.visits (clinic_id, appointment_id, patient_id, doctor_notes, diagnosis) values
  ('00000000-0000-0000-0000-00000000c11a', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000f1',
   'SECRET DOCTOR NOTE', 'Test diagnosis');

-- ---------- 1. Row Level Security is ON for every table ----------
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0, 'RLS is enabled on every table in public');

-- ---------- 2. Attender cannot read doctor notes ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select count(*)::int from public.visits), 0, 'ATTENDER tries to read doctor notes (visits): blocked, sees 0 rows');
select is((select count(*)::int from public.visits where doctor_notes like '%SECRET%'), 0, 'ATTENDER cannot find the secret note text');
select throws_ok(
  $$insert into public.visits (clinic_id, appointment_id, patient_id, doctor_notes)
    values ('00000000-0000-0000-0000-00000000c11a', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000f1', 'x')$$,
  '42501', null, 'ATTENDER cannot write doctor notes');
select is((select count(*)::int from public.treatment_courses), 0, 'ATTENDER cannot read treatment courses');
select is((select count(*)::int from public.reminders), 0, 'ATTENDER cannot read reminders');
select is((select count(*)::int from public.patients), 3, 'ATTENDER sees the 3 patients of own clinic');
select is((select count(*)::int from public.audit_log), 0, 'ATTENDER cannot read the audit log');
select lives_ok(
  $$insert into public.audit_log (clinic_id, user_id, action, record_table)
    values ('00000000-0000-0000-0000-00000000c11a', '00000000-0000-0000-0000-0000000000a1', 'view', 'patients')$$,
  'ATTENDER can add own audit entries');
select throws_ok(
  $$insert into public.audit_log (clinic_id, user_id, action, record_table)
    values ('00000000-0000-0000-0000-00000000c11a', '00000000-0000-0000-0000-0000000000a2', 'view', 'patients')$$,
  '42501', null, 'nobody can write audit entries in another user''s name');
select throws_ok($$select public.call_next('00000000-0000-0000-0000-00000000c11a')$$, 'P0001', 'not allowed', 'ATTENDER cannot run the doctor queue');

-- ---------- 3. Doctor can read notes; admin cannot ----------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select is((select count(*)::int from public.visits), 1, 'DOCTOR can read doctor notes');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
select is((select count(*)::int from public.visits), 0, 'ADMIN cannot read doctor notes (doctor only)');
select ok((select count(*) from public.audit_log) > 0, 'ADMIN can read the audit log');

-- ---------- 4. Audit log can never be edited or deleted ----------
select throws_ok($$update public.audit_log set action = 'changed'$$, '42501', null, 'audit_log UPDATE is blocked');
select throws_ok($$delete from public.audit_log$$, '42501', null, 'audit_log DELETE is blocked');
reset role;
select throws_ok($$update public.audit_log set action = 'changed'$$, 'P0001', 'audit_log is append-only', 'audit_log is append-only even for the database owner');

-- ---------- 5. One clinic never sees another clinic ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select is((select count(*)::int from public.patients), 0, 'CLINIC B staff cannot see Clinic A patients');
select is((select count(*)::int from public.appointments), 0, 'CLINIC B staff cannot see Clinic A appointments');
select throws_ok(
  $$insert into public.patients (clinic_id, name, phone) values ('00000000-0000-0000-0000-00000000c11a', 'Intruder', '9833333333')$$,
  '42501', null, 'CLINIC B staff cannot add patients to Clinic A');
select throws_ok(
  $$select public.book_appointment('00000000-0000-0000-0000-00000000c11a', '00000000-0000-0000-0000-0000000000f1', public.clinic_today() + 1, 'attender')$$,
  'P0001', 'not allowed', 'CLINIC B staff cannot book in Clinic A');

-- ---------- 6. Anonymous visitors (no login) ----------
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$select * from public.patients$$, '42501', null, 'ANON cannot read patients');
select throws_ok($$select * from public.visits$$, '42501', null, 'ANON cannot read doctor notes');
select throws_ok($$select * from public.patient_otps$$, '42501', null, 'ANON cannot read OTPs');
select lives_ok($$select now_running, pending_tokens from public.queue_status$$, 'ANON can read queue numbers (no names)');

-- ---------- 7. Booking rules ----------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is(
  public.book_appointment('00000000-0000-0000-0000-00000000c11a', '00000000-0000-0000-0000-0000000000f1', public.clinic_today() + 1, 'attender') ->> 'result',
  'booked', 'booking gives a token');
select is(
  public.book_appointment('00000000-0000-0000-0000-00000000c11a', '00000000-0000-0000-0000-0000000000f1', public.clinic_today() + 1, 'attender') ->> 'result',
  'existing', 'same patient, same day: no second booking');
select is(
  public.book_appointment('00000000-0000-0000-0000-00000000c11a', '00000000-0000-0000-0000-0000000000f2', public.clinic_today() + 1, 'qr', 1) ->> 'result',
  'slot_taken', 'a taken slot cannot be booked twice');
select is(
  public.book_appointment('00000000-0000-0000-0000-00000000c11a', '00000000-0000-0000-0000-0000000000f2', public.clinic_today() + 1, 'attender') ->> 'result',
  'booked', 'second patient gets the last slot (2 slots per day)');
select is(
  public.book_appointment('00000000-0000-0000-0000-00000000c11a', '00000000-0000-0000-0000-0000000000f3', public.clinic_today() + 1, 'attender') ->> 'next_free_day',
  (public.clinic_today() + 2)::text, 'full day says "full" and offers the next free day');

select * from finish();
rollback;
