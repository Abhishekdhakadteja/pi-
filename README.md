# ClinicEase (version 1)

A simple app for small private clinics in India: front-desk booking, today's list, doctor view,
QR booking for patients, live queue, medicine-course reminders and reports. Built for cheap
Android phones and slow internet, in Hindi and English.

**Stack:** Next.js 15 (App Router) + Tailwind CSS 4 + Supabase (Postgres, Auth, Realtime).

> ⚠️ Use only fake/demo patients until the launch checklist in the Master Plan is complete.

---

## आसान शुरुआत (Quick start, Hindi)

1. कंप्यूटर पर **Node.js 20+** और **Git** install करें।
2. यह repo download करें: `git clone https://github.com/Abhishekdhakadteja/pi-.git clinicease && cd clinicease`
3. `npm install`
4. [supabase.com](https://supabase.com) पर नया project बनाएँ (Region: **Mumbai**)। नीचे "Supabase setup" के steps करें।
5. `.env.example` को copy करके `.env.local` बनाएँ और उसमें Supabase की URL और keys भरें।
6. `npm run seed` चलाएँ (demo clinic और demo staff बन जाएँगे)।
7. `npm run dev` चलाएँ और browser में **http://localhost:3000** खोलें।

Demo login (password `Demo@12345`):

| Role | Email | Mobile |
|---|---|---|
| Attender | attender@demo.clinic | 9000000001 |
| Doctor | doctor@demo.clinic | 9000000002 |
| Admin | admin@demo.clinic | 9000000003 |

Patient booking page: `http://localhost:3000/book/demo` (development OTP: `123456`).

---

## Supabase setup (one time)

1. Create a project at supabase.com. Choose region **South Asia (Mumbai)**.
2. **Run the database migrations** (tables, security rules, functions). Either:
   - Easiest: open **SQL Editor** and run these files one by one, in order:
     1. `supabase/migrations/20261111000001_core_schema.sql`
     2. `supabase/migrations/20261111000002_booking_and_queue.sql`
     3. `supabase/migrations/20261111000003_patient_otp.sql`
     4. `supabase/migrations/20261111000004_reminders.sql`
     5. `supabase/migrations/20261111000005_hardening.sql`
   - Or with the CLI: `npx supabase link --project-ref <your-ref>` then `npx supabase db push`.
3. **Authentication → Sign In / Providers → Email:** turn **OFF** "Allow new users to sign up".
   Staff accounts are created by the admin/seed script only.
4. **Project Settings → API:** copy the Project URL, `anon` key and `service_role` key into `.env.local`.
5. `npm run seed` to create the demo clinic and demo staff.

## Environment variables (set ALL of these)

| Variable | Where it is used | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | no (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (data is protected by Row Level Security) | no (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only: patient booking after OTP, reminder job, phone login | **YES** |
| `APP_URL` | Public address of the app, used in the QR code and reminder links (e.g. `https://clinicease.vercel.app`) | no |
| `PATIENT_SESSION_SECRET` | Signs the patient's verified-phone cookie and OTP hashes. Random 64 chars | **YES** |
| `CRON_SECRET` | Protects the daily reminder job URL | **YES** |
| `INBOUND_WEBHOOK_SECRET` | Protects the incoming SMS/WhatsApp (STOP) webhook | **YES** |
| `MESSAGING_PROVIDER` | `log` (default: messages are only printed, nothing is sent). Later `msg91` / `whatsapp` | no |
| `DEMO_OTP` | Fixed OTP for testing. **Ignored in production builds.** | no |

Make random secrets with `openssl rand -hex 32`. Never put a secret in a variable that starts with `NEXT_PUBLIC_`.

## Deploy (Vercel, free plan is enough to start)

1. Push this repo to GitHub, then "Import project" on vercel.com.
2. Add all environment variables above (with `APP_URL` = your Vercel address).
3. Deploy. `vercel.json` already schedules the reminder job daily at **03:30 UTC = 9:00 AM India time**.
4. Log in as admin → **Generate clinic QR code** → print the A4 poster.

## Deploy (Netlify, alternative to Vercel)

1. On netlify.com: "Add new project" → "Import from GitHub" → this repo. `netlify.toml` already has the build settings.
2. Add all environment variables above (with `APP_URL` = your Netlify address, e.g. `https://clinicease.netlify.app`).
3. Deploy. `netlify/functions/reminders-cron.mts` runs the reminder job daily at **03:30 UTC = 9:00 AM India time**
   (it calls `/api/cron/reminders` with `CRON_SECRET`). Use either Vercel or Netlify, not both.

## Daily automatic backup (important)

Patient data lives only in Supabase. Before real patients:

- **Recommended:** Supabase **Pro plan** (about $25/month) — daily automatic backups kept 7 days, and the
  project never pauses. (Free projects pause after 1 week without use and have no downloadable backups.)
- **Extra safety (any plan):** a daily `pg_dump` to storage you control, e.g. a scheduled GitHub Action:
  `pg_dump "$SUPABASE_DB_URL" --no-owner -Fc -f backup-$(date +%F).dump` (DB URL from Project Settings → Database).
- Test a restore once a month into a fresh Supabase project.
- Weekly "Export to Excel" from Reports is a human-readable copy (it never contains doctor notes).

## How it works

| Page | Who | What |
|---|---|---|
| `/login` | staff | Email **or** mobile + password. Each role goes to its own home. |
| `/desk` | attender, admin | Search by mobile, add patient (consent required), book today / another day, token in big text, "day full → next free day". |
| `/today` | all staff | Today's patients in token order, Total / Done / Remaining, live updates, "Missed" button. |
| `/doctor` | doctor | Patient in room, past notes, today's notes + diagnosis, medicine course (end date + next visit computed), **Complete** calls the next patient. |
| `/book/<clinic>` | patients (public) | OTP → choose family member or add one → 14-day calendar (full days greyed) → slot → token. One booking per patient per day. |
| `/queue/<clinic>?t=<token>&d=<date>` | patients (public) | Now running / your number / patients ahead, live; "be ready" 2 numbers away; "go in now"; numbers only. |
| `/admin` | admin | Clinic settings, QR poster. |
| `/admin/reminders` | admin | Reminders sent + status, edit wording (Hindi/English), stop messages for a number. |
| `/reports` | admin, doctor | Today / week / month numbers, Excel export (no doctor notes). |

**Reminders:** every morning at 9:00 IST the job finds medicine courses ending within 2 days (consent given,
not opted out, not already booked) and sends one message with a personal booking link. If the patient has not
booked 2 days later, one follow-up is sent, then it stops. Never more than 2 per course (enforced by the database).
Messages never contain disease or medicine names. Replies of **STOP** (via `/api/webhooks/inbound-sms`) or the
admin page stop all messages to that number.

Run the job by hand: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders`

**Connecting SMS / WhatsApp later:** fill in `Msg91Sender` / `WhatsAppSender` in `src/lib/messaging/index.ts`
and set `MESSAGING_PROVIDER`. In India, SMS needs **DLT registration**: register the reminder and OTP texts as
DLT templates exactly as they appear on the admin page. Point the provider's inbound-message webhook to
`https://<your-app>/api/webhooks/inbound-sms?secret=<INBOUND_WEBHOOK_SECRET>`.

## Security rules (built in)

- Every table has `clinic_id` and **Row Level Security**; a clinic only ever sees its own rows.
- Doctor notes (`visits`) can be read and written **only by the doctor** role — not the attender, not the admin.
- Every patient view (app) and every change (database trigger) is written to `audit_log`, which is insert-only
  (updates/deletes are blocked even for the database owner). Excel exports are logged too.
- The public booking page shows nothing until the OTP is verified, and only the verified number's family.
- OTPs are hashed, expire in 10 minutes, max 5 tries, max 3 SMS per 10 minutes per number.
- The live queue shows numbers only.

## Tests

```bash
npm test                 # 27 unit tests: phone/date validation, course dates, queue logic, reminder text
npx supabase start       # local Supabase in Docker (needed for the next two)
npm run test:db          # 30 database security tests (RLS: attender blocked from doctor notes, etc.)
npx playwright install chromium && npm run test:e2e   # end-to-end: QR booking → desk → doctor → live queue → reminder
npm run build && npm run check:secrets                # no secret keys in browser code
```

## Local development with a local Supabase (optional)

```bash
npx supabase start            # needs Docker
npx supabase status -o env    # copy API_URL, ANON_KEY, SERVICE_ROLE_KEY into .env.local
npm run seed && npm run dev
```
