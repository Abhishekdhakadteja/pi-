# Clinic Easy AI on WhatsApp

## What is in the code
- `/whatsapp`: public page with chat button, QR, keyword list (DEMO, PLANS, PRO, HELP) and optional Channel link.
- `/demo`: 5-minute live demo. Doctor or front-desk view of a FAKE demo clinic (slug `live-demo`, never listed publicly).
  - Sign-in is made on the server (one-time magic-link token, no password, no email sent).
  - A signed `ce_demo` cookie holds the end time. Middleware signs the browser out when it is gone or expired; `getStaff()` refuses a demo login without a valid cookie for the same user.
  - Limits: 4 starts per IP per 24 h, 300 per day for the site (`demo_sessions` table).
  - No AI cost: demo clinic is Basic, Pro trial and buying are blocked, `requireProAI` refuses the demo clinic.
  - Fake data is topped up on each start (today's queue, last 6 days, payments, an expense).
- In-app "Get Pro on WhatsApp": opens Clinic Easy's number with plan, clinic name and Ref (clinic slug) prefilled.
- After payment: `proWelcome()` builds the welcome + demo message.
  - Free mode: owner presses "Doctor को Welcome भेजें" on `/owner` after saving a plan.
  - Automatic mode: set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WELCOME_TEMPLATE` (approved template with 3 body variables: doctor, plan, login link). Razorpay-paid orders then get it by themselves.

## Netlify settings (all optional)
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: the WhatsApp Business number (10 digits). Default: Sales founder.
- `NEXT_PUBLIC_WHATSAPP_CHANNEL_URL`: WhatsApp Channel share link.

## Database
`supabase/migrations/20261127000001_live_demo.sql` (applied 2026-11-27).
