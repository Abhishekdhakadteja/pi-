# Clinic Easy को free-limit से बचाना (Cloudflare standby + backups)

Written 2026-11-22. Live site still runs on Netlify + Supabase. Nothing here moves live traffic.

## 1. खतरे कहाँ हैं (audit)

| Service | Free plan में क्या होता है | असर | हमारा बचाव |
|---|---|---|---|
| **Netlify (free)** | Monthly credits खत्म होने पर site **pause** हो जाती है, अगले महीने तक | पूरी app बंद | Cloudflare standby copy (नीचे) |
| **Supabase (free)** | ~7 दिन कोई activity नहीं तो project **pause** | login/save बंद | `supabase-keepalive.yml` रोज़ एक छोटी read |
| Supabase (free) | DB 500 MB से ऊपर गया तो **read-only** | नया data save नहीं | Supabase dashboard → Reports में size देखते रहें; 300 MB पर Pro ($25) |
| Supabase (free) | कोई automatic backup नहीं | data हमेशा के लिए जा सकता है | `db-backup.yml` (दिन में 2 बार) + R2 copy |
| GitHub backup | **22 Nov 2026 तक हर run fail** हुआ, क्योंकि 2 secrets नहीं डाले | अभी तक एक भी backup नहीं | नीचे Step A |

## 2. Database को Cloudflare D1 पर ले जाना? **नहीं (अभी)**

- D1 SQLite है, हमारा DB Postgres है: login (Supabase Auth), RLS security rules, 10+ migrations, triggers सब दोबारा लिखने पड़ेंगे। हफ्तों का काम और data खोने का risk।
- Supabase का असली खतरा "pause" और "backup नहीं" है, और दोनों अब free में ठीक हो रहे हैं।
- जब 10+ paying clinics हों: Supabase Pro ($25 ≈ ₹2,100/महीना) लें। उसमें daily backup, कोई pause नहीं, 8 GB DB।

## 3. Hosting: Cloudflare Workers standby

- App Cloudflare Workers पर build होती है (OpenNext)। Local test: `/`, `/health`, `/health/doctors`, `/pricing`, `/login` सब 200। Size 2.4 MB gzip (limit 64 MB)।
- **Free plan की सच्चाई:** Cloudflare free "unlimited" नहीं है। 100,000 requests/दिन और 10 ms CPU per request। Server-rendered pages कभी-कभी 10 ms से ऊपर जाते हैं, तो free पर standby ठीक है, पर पूरी live traffic के लिए **Workers Paid $5/महीना (≈ ₹450)** लें। उसमें 1 करोड़ requests/महीना शामिल हैं और limit पर site बंद नहीं होती।
- Static files (images, JS) Cloudflare पर हमेशा free और unlimited हैं।

## 4. आपको क्या करना है (एक बार, ~10 मिनट)

GitHub: **Settings → Secrets and variables → Actions → New repository secret**

**Step A, backup (सबसे ज़रूरी):**
1. `SUPABASE_DB_URL`: Supabase → Connect → Session pooler (port 5432) string, password भरकर।
2. `BACKUP_PASSPHRASE`: 20+ अक्षर का password। इसकी copy कागज़ पर भी रखें।
3. Actions → Database backup → Run workflow। हरा ✓ आना चाहिए।

**Step B, R2 दूसरी copy (optional, free 10 GB):**
1. Cloudflare dashboard → R2 → "Enable R2" (card माँगेगा, free सीमा में ₹0 कटता है)।
2. Bucket बनाएँ `clinic-easy-backups`। R2 → Manage API tokens → "Object Read & Write" उसी bucket पर।
3. GitHub secrets: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` = `clinic-easy-backups`।

**Step C, Cloudflare standby site:**
1. Cloudflare → My Profile → API Tokens → Create → template **"Edit Cloudflare Workers"**।
2. GitHub secret `CLOUDFLARE_API_TOKEN` (और `CLOUDFLARE_ACCOUNT_ID`, dashboard के दाईं ओर लिखा होता है)।
3. वही server keys GitHub secrets में भी डालें जो Netlify में हैं: कम से कम `SUPABASE_SERVICE_ROLE_KEY`, `PATIENT_SESSION_SECRET`, `CRON_SECRET`, `OWNER_EMAILS`। बाकी (`MSG91_*`, `WHATSAPP_*`, `RAZORPAY_*` ...) जो Netlify में हैं।
4. Actions → Cloudflare standby → Run workflow। Site मिलेगी: `https://clinic-easy.<आपका-subdomain>.workers.dev`

## 5. Netlify बंद हो जाए तो (switch, 5 मिनट)

1. Standby URL खोलकर login check करें।
2. Supabase → Authentication → URL Configuration में standby URL जोड़ें।
3. Clinics को नया link भेजें (या अपना domain हो तो DNS Cloudflare पर point करें)।
4. Daily reminders: `wrangler.jsonc` में `"triggers": { "crons": ["30 3 * * *"] }` जोड़ना होगा (Netlify cron की जगह)। यह switch के समय करें, अभी नहीं, ताकि reminders दो बार न जाएँ।

Long term: अपना domain (जैसे clinic-easy.in, ~₹800/साल) Cloudflare DNS पर रखें। तब Netlify से Cloudflare पर switch सिर्फ एक DNS बदलाव होगा, clinics को नया link नहीं भेजना पड़ेगा।
