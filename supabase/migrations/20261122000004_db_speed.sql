-- Database speed for when clinics grow (same rules, faster checks). No data or permission change.
--
-- 1) RLS policies: wrap auth.uid() / my_clinic_id() / my_role() in (select ...) so Postgres
--    evaluates them once per query instead of once per row (Supabase advisor 0003).
alter policy audit_insert on public.audit_log
  with check ((clinic_id = (select my_clinic_id())) and (user_id = (select auth.uid())));

alter policy payments_insert on public.payments
  with check ((clinic_id = (select my_clinic_id())) and (created_by = (select auth.uid())));

alter policy payments_update on public.payments
  using ((clinic_id = (select my_clinic_id())) and (((select my_role()) = any (array['doctor'::user_role, 'admin'::user_role])) or ((created_by = (select auth.uid())) and (paid_on = clinic_today()))))
  with check ((clinic_id = (select my_clinic_id())) and (((select my_role()) = any (array['doctor'::user_role, 'admin'::user_role])) or ((created_by = (select auth.uid())) and (paid_on = clinic_today()))));

alter policy expenses_insert on public.expenses
  with check ((clinic_id = (select my_clinic_id())) and ((select my_role()) = any (array['doctor'::user_role, 'admin'::user_role])) and (created_by = (select auth.uid())));

alter policy staff_devices_own_read on public.staff_devices using (user_id = (select auth.uid()));

alter policy presence_events_own_read on public.staff_presence_events using (user_id = (select auth.uid()));

-- 2) Indexes on foreign keys the app filters or joins by (advisor 0001), so patient history,
--    prescriptions and courses stay fast with thousands of visits.
create index if not exists visits_clinic_idx on public.visits (clinic_id, created_at desc);
create index if not exists visits_doctor_idx on public.visits (doctor_id);
create index if not exists prescription_items_clinic_idx on public.prescription_items (clinic_id);
create index if not exists treatment_courses_clinic_idx on public.treatment_courses (clinic_id);
create index if not exists treatment_courses_patient_idx on public.treatment_courses (patient_id);
create index if not exists payments_patient_idx on public.payments (patient_id);
create index if not exists appointments_doctor_idx on public.appointments (doctor_id);
create index if not exists appointments_reminder_idx on public.appointments (reminder_id);
create index if not exists appointments_created_by_idx on public.appointments (created_by);
create index if not exists payments_created_by_idx on public.payments (created_by);
create index if not exists expenses_created_by_idx on public.expenses (created_by);
create index if not exists reminders_sent_by_idx on public.reminders (sent_by);
create index if not exists staff_presence_events_node_idx on public.staff_presence_events (node_id);
