-- ClinicEase v1 — Prompt 6: editable reminder wording per clinic.
-- Placeholders: {patient} {doctor} {clinic} {link}. NEVER put disease or medicine names here.
alter table public.clinics
  add column reminder_template_hi text not null default
    'Namaste {patient}, {clinic} se Dr. {doctor} ka sandesh: aapka course poora hone wala hai. Ilaaj beech me na ruke, kripya jaldi milne ka time book karein: {link}. Band karne ke liye STOP likhein.',
  add column reminder_template_en text not null default
    'Hello {patient}, a message from Dr. {doctor} at {clinic}: your course is about to end. So your treatment is not interrupted, please book your visit here: {link}. Reply STOP to stop messages.',
  add column reminder_channel public.msg_channel not null default 'sms';

alter table public.clinics add constraint reminder_templates_have_link
  check (position('{link}' in reminder_template_hi) > 0 and position('{link}' in reminder_template_en) > 0);

-- Short personal booking code for the reminder link (keeps the SMS short).
alter table public.reminders add column link_code text unique check (link_code ~ '^[A-Za-z0-9]{8,16}$');
