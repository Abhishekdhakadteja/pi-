-- ClinicEase v2 ("zero-cost 10x", small clinic):
--   fees + UPI (clinic's own UPI ID, no payment gateway), expenses + balance sheet,
--   prescriptions (medicine, dose, days), free WhatsApp sending by one tap (no paid API),
--   booking without paid OTP, a second (follow-up) reminder text.
-- Amounts are whole rupees (int). All dates are India time.

-- ---------- Clinic settings ----------
alter table public.clinics
  add column upi_id text check (upi_id is null or upi_id ~ '^[A-Za-z0-9._-]{2,64}@[A-Za-z0-9.-]{2,64}$'),
  add column default_fee int not null default 0 check (default_fee between 0 and 100000),
  -- false = patients book with mobile number only (no SMS cost). true = SMS OTP (needs a paid SMS provider).
  add column booking_otp boolean not null default false,
  add column followup_template_hi text not null default
    'Namaste {patient}, Dr. {doctor} ({clinic}) aapki sehat ko lekar chintit hain. Dawa beech me chhodne se bimari wapas badh sakti hai aur ilaaj lamba ho jata hai. Aaj hi apna number book karein: {link}. STOP likhein to sandesh band.',
  add column followup_template_en text not null default
    'Hello {patient}, Dr. {doctor} ({clinic}) is concerned about your health. Stopping treatment midway can bring the problem back and make it longer to cure. Please book your visit today: {link}. Reply STOP to stop messages.';

alter table public.clinics add constraint followup_templates_have_link
  check (position('{link}' in followup_template_hi) > 0 and position('{link}' in followup_template_en) > 0);

-- Reminders can now wait for staff to send them by one tap on WhatsApp (free).
alter table public.reminders drop constraint if exists reminders_status_check;
alter table public.reminders add constraint reminders_status_check
  check (status in ('queued', 'sent', 'logged', 'failed', 'skipped', 'manual'));
alter table public.reminders add column sent_by uuid references public.users (id) on delete set null;

-- Attender and doctor may mark a reminder as sent (one-tap WhatsApp); all clinic staff may read reminders.
drop policy if exists reminders_select on public.reminders;
create policy reminders_select on public.reminders for select to authenticated
  using (clinic_id = public.my_clinic_id());
create policy reminders_staff_mark_sent on public.reminders for update to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() in ('attender', 'doctor'))
  with check (clinic_id = public.my_clinic_id());

-- ---------- Payments (money in) ----------
create type public.pay_mode as enum ('cash', 'upi', 'card', 'other');
create type public.pay_kind as enum ('consultation', 'procedure', 'medicine', 'test', 'other');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  created_at timestamptz not null default now(),
  paid_on date not null default public.clinic_today(),
  appointment_id uuid references public.appointments (id) on delete set null,
  patient_id uuid references public.patients (id) on delete set null,
  amount int not null check (amount between 0 and 10000000),
  discount int not null default 0 check (discount between 0 and 10000000),
  mode public.pay_mode not null default 'cash',
  kind public.pay_kind not null default 'consultation',
  note text check (note is null or length(note) <= 300),
  created_by uuid references auth.users (id) on delete set null
);
create index payments_clinic_day_idx on public.payments (clinic_id, paid_on);
create unique index payments_one_consult_per_appt on public.payments (appointment_id)
  where appointment_id is not null and kind = 'consultation';

-- ---------- Expenses (money out) ----------
create type public.expense_kind as enum ('rent', 'salary', 'medicine_purchase', 'electricity', 'equipment', 'other');

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  created_at timestamptz not null default now(),
  spent_on date not null default public.clinic_today(),
  category public.expense_kind not null default 'other',
  amount int not null check (amount between 1 and 10000000),
  note text check (note is null or length(note) <= 300),
  created_by uuid references auth.users (id) on delete set null
);
create index expenses_clinic_day_idx on public.expenses (clinic_id, spent_on);

-- ---------- Prescription lines ----------
create table public.prescription_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  created_at timestamptz not null default now(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  position int not null default 1 check (position between 1 and 30),
  medicine text not null check (length(trim(medicine)) between 1 and 120),
  dose text check (dose is null or length(dose) <= 40),          -- e.g. 1-0-1
  timing text check (timing is null or timing in ('before_food', 'after_food', 'any')),
  days int not null check (days between 1 and 365),
  note text check (note is null or length(note) <= 200),
  unique (appointment_id, position)
);
create index rx_patient_idx on public.prescription_items (patient_id, created_at desc);

-- ---------- Row Level Security ----------
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.prescription_items enable row level security;
revoke all on public.payments, public.expenses, public.prescription_items from anon;

-- payments: every staff member of the clinic can collect and see; only admin can change or delete.
create policy payments_select on public.payments for select to authenticated
  using (clinic_id = public.my_clinic_id());
create policy payments_insert on public.payments for insert to authenticated
  with check (clinic_id = public.my_clinic_id() and created_by = auth.uid());
create policy payments_admin_update on public.payments for update to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() = 'admin')
  with check (clinic_id = public.my_clinic_id());
create policy payments_admin_delete on public.payments for delete to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() = 'admin');

-- expenses: owner side only (doctor + admin), the attender does not see the clinic's costs.
create policy expenses_select on public.expenses for select to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() in ('doctor', 'admin'));
create policy expenses_insert on public.expenses for insert to authenticated
  with check (clinic_id = public.my_clinic_id() and public.my_role() in ('doctor', 'admin') and created_by = auth.uid());
create policy expenses_delete on public.expenses for delete to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() in ('doctor', 'admin'));

-- prescriptions: doctor writes; all clinic staff read (the attender prints / shares the slip).
-- Doctor notes stay in `visits` and remain doctor-only.
create policy rx_select on public.prescription_items for select to authenticated
  using (clinic_id = public.my_clinic_id());
create policy rx_doctor_insert on public.prescription_items for insert to authenticated
  with check (clinic_id = public.my_clinic_id() and public.my_role() = 'doctor');
create policy rx_doctor_update on public.prescription_items for update to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() = 'doctor')
  with check (clinic_id = public.my_clinic_id());
create policy rx_doctor_delete on public.prescription_items for delete to authenticated
  using (clinic_id = public.my_clinic_id() and public.my_role() = 'doctor');

-- Every change is audited, like patient records.
create trigger audit_payments after insert or update or delete on public.payments
  for each row execute function public.audit_changes();
create trigger audit_expenses after insert or update or delete on public.expenses
  for each row execute function public.audit_changes();
create trigger audit_rx after insert or update or delete on public.prescription_items
  for each row execute function public.audit_changes();
