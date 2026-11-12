-- ClinicEase v2.1: reason for visit + fixing typing mistakes.
--   * appointments.complaint: what the patient told the attender ("fever since 2 days").
--   * payments: doctor and admin can correct any fee; the attender can correct a fee
--     they collected themselves, on the same day only.
--   * expenses: doctor and admin can correct an expense.
-- Every change stays in the audit log (existing triggers).

alter table public.appointments
  add column if not exists complaint text
  check (complaint is null or length(complaint) <= 300);

drop policy if exists payments_admin_update on public.payments;
drop policy if exists payments_update on public.payments;
create policy payments_update on public.payments for update to authenticated
  using (
    clinic_id = public.my_clinic_id()
    and (
      public.my_role() in ('doctor', 'admin')
      or (created_by = auth.uid() and paid_on = public.clinic_today())
    )
  )
  with check (
    clinic_id = public.my_clinic_id()
    and (
      public.my_role() in ('doctor', 'admin')
      or (created_by = auth.uid() and paid_on = public.clinic_today())
    )
  );

drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses for update to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() in ('doctor', 'admin'))
  with check (clinic_id = public.my_clinic_id() and public.my_role() in ('doctor', 'admin'));
