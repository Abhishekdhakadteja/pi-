# Clinic Easy: लाइव करने की गाइड (Basic आज, Pro और Pro Max बाद में)

Basic प्लान बिना किसी पेड सेवा के चलता है: Supabase Free + Netlify Free + मुफ़्त 1-टैप WhatsApp लिंक।
Pro और Pro Max की चाबियाँ (keys) खाली छोड़ दें तो वो सेवाएँ ऐप में "जल्द / Connect" दिखेंगी, कुछ टूटेगा नहीं।

## 1. डेटाबेस (Supabase SQL Editor)

Supabase → प्रोजेक्ट "clinicease" → SQL Editor → New query → नीचे वाली फ़ाइल का पूरा text चिपकाएँ → Run।

| फ़ाइल | चलानी है? |
|---|---|
| `supabase/migrations/20261111*` से `20261118000001_pro_subscription.sql` तक | पहले ही चल चुकी हैं (19 नवंबर की जाँच) |
| `supabase/migrations/20261119000001_pro_automation.sql` | **हाँ, अब चलाएँ** (दो बार चलाने से भी कुछ नहीं बिगड़ता) |
| `supabase/migrations/20261120000001_public_doctor_directory.sql` | **हाँ** (आम लोगों की डॉक्टर लिस्ट: शहर, विशेषज्ञता, "लिस्ट में दिखाएं") |

यह SQL तीन नई टेबल (स्टाफ ट्रैकिंग) और `clinics.ai_knowledge` कॉलम जोड़ती है। Basic इनके बिना भी चलता है, पर merge से पहले चला लें।

## 2. Netlify Environment variables

Netlify → clinicease-demo → Site configuration → Environment variables।

### Basic के लिए ज़रूरी (ये पहले से सेट हैं, बस जाँच लें)

| Key | क्या डालना है |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | वहीं से `anon` / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | वहीं से `service_role` key (गुप्त रखें) |
| `APP_URL` | `https://clinicease-demo.netlify.app` (या आपका डोमेन) |
| `PATIENT_SESSION_SECRET` | कोई भी लंबा random text (32+ अक्षर) |
| `CRON_SECRET` | कोई भी लंबा random text (रोज़ सुबह के रिमाइंडर जॉब के लिए) |
| `INBOUND_WEBHOOK_SECRET` | कोई भी लंबा random text |
| `OWNER_EMAILS` | आपका ईमेल (सिर्फ़ आप /owner पेज खोल सकें, क्लिनिक बना सकें, Pro चालू कर सकें) |
| `NEXT_PUBLIC_SUPPORT_PHONE` | आपका सपोर्ट WhatsApp नंबर, जैसे 91XXXXXXXXXX |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | सपोर्ट ईमेल |
| `MESSAGING_PROVIDER` | `manual` रखें या खाली छोड़ें (= मुफ़्त 1-टैप WhatsApp) |

### Basic में खाली छोड़ सकते हैं (Pro / Pro Max की चाबियाँ)

| Key | किस लिए | खाली हो तो |
|---|---|---|
| `ANTHROPIC_API_KEY` | AI सारांश, AI मैनेजर (Pro) | AI बंद; Basic पर वैसे भी कभी नहीं चलता |
| `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` | ऑटो SMS (Pro) | 1-टैप WhatsApp चलता रहेगा |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE` | ऑटो WhatsApp (Pro) | 1-टैप WhatsApp चलता रहेगा |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | ऑनलाइन पेमेंट से Pro खरीदना | "WhatsApp पर Pro लें" बटन; आप /owner से Pro चालू करते हैं |
| `DEMO_OTP` | सिर्फ़ टेस्टिंग | production में अपने-आप बंद |
| `GOOGLE_PLACES_API_KEY` | /health/doctors पर शहर के बाकी डॉक्टरों की लाइव लिस्ट (Google Places API New) | मुफ़्त "Google Maps में खोलें" बटन दिखता है |

> **ध्यान:** `ANTHROPIC_API_KEY` लगी है तो Basic पर ₹0 खर्च है, पर कोई भी Basic क्लिनिक 14 दिन का मुफ़्त Pro ट्रायल शुरू कर सकता है और ट्रायल में AI चलेगा। इसलिए console.anthropic.com → Limits में **$10/महीना की spend limit** ज़रूर लगाएँ।

## 3. GitHub (मुफ़्त बैकअप, दिन में दो बार)

GitHub → repo → Settings → Secrets and variables → Actions → New repository secret:

- `SUPABASE_DB_URL`: Supabase → Connect → **Session pooler** वाली connection string (पासवर्ड भरकर)
- `BACKUP_PASSPHRASE`: कोई लंबा पासवर्ड। इसे कहीं सुरक्षित लिख लें, इसके बिना बैकअप नहीं खुलेगा।

पूरी जानकारी `docs/BACKUP.md` में है।

## 4. Merge और Deploy

1. ऊपर का SQL चलाएँ।
2. GitHub पर फ़ाइनल PR खोलें → "Merge pull request" दबाएँ।
3. Netlify अपने-आप नया deploy बनाएगा (2-4 मिनट)। Deploys पेज पर "Published" दिखे तो हो गया।
4. **जाँच (5 मिनट):**
   - `/login` पर demo डॉक्टर से लॉगिन करें। AI ब्रीफ़ पर 🔒 और "Pro" दिखना चाहिए।
   - `/pricing` पर तीन प्लान दिखें: Basic ₹499, Pro ₹2,999, Pro Max ~~₹15,999~~ ₹9,999।
   - एक टेस्ट मरीज़ की बुकिंग करें, कतार चलाएँ, पर्ची बनाएँ, Messages में 1-टैप WhatsApp दबाकर देखें।

## 5. नया क्लिनिक जोड़ना (Basic)

`/owner` (सिर्फ़ `OWNER_EMAILS` वाले ईमेल से) → "New clinic" → डॉक्टर का मोबाइल, एडमिन ईमेल, अटेंडर → बनाएँ।
क्लिनिक 30 दिन Basic मुफ़्त पर रहता है। पैसे मिलने पर /owner से ही Pro या Pro Max चालू करें।

## 6. Pro और Pro Max कब और क्या जोड़ना है

| प्लान | जोड़ना है | खर्च (अंदाज़न, असली दाम ख़रीदते समय देखें) |
|---|---|---|
| Pro | `ANTHROPIC_API_KEY` | AI सारांश ~₹0.10-0.20 (Haiku), AI मैनेजर ~₹3 प्रति सवाल (Sonnet) |
| Pro | ऑटो WhatsApp: Meta WhatsApp Cloud API (बिज़नेस वेरिफ़िकेशन + utility template) | ~₹0.12-0.15 प्रति मैसेज |
| Pro (विकल्प) | ऑटो SMS: MSG91 + DLT रजिस्ट्रेशन | ~₹0.20-0.25 प्रति SMS + DLT की एक बार की फ़ीस |
| Pro | Razorpay (ऑनलाइन पेमेंट) | 2% + GST प्रति पेमेंट |
| Pro | AI कॉलिंग | अभी बना नहीं ("जल्द"); बाद में ~₹2-4 प्रति मिनट |
| सब | Supabase Pro ($25 ≈ ₹2,750/महीना) | ~6 पेड क्लिनिक या DB 350 MB होने पर |
| सब | Netlify Personal ($9) | तीसरे क्लिनिक से पहले |
| Pro Max | ESP32 + 2 टैग + लगाना | ~₹4,000 एक बार प्रति क्लिनिक |
| Pro Max | हेल्थ रिपोर्ट के लिए Android ऐप (Play Console) | $25 एक बार |

## 7. आम लोगों वाला हिस्सा (/health): डॉक्टर खोजें + मेरा दिन

- `/health/doctors`: बीमारी लिखें → सही विशेषज्ञ (डायग्नोसिस नहीं) → (1) Clinic Easy क्लिनिक जो "लिस्ट में दिखाएं" चुनते हैं, ऑनलाइन बुकिंग के साथ, (2) Google Places से शहर के बाकी डॉक्टर, (3) हमेशा मुफ़्त Google Maps बटन। इमरजेंसी शब्द (सीने में तेज दर्द, बेहोश...) पर 108 बटन।
- `/health/routine`: मुफ़्त नियम-आधारित दिनचर्या, फोन में ही सेव, कैलेंडर (.ics) रिमाइंडर। "AI के साथ" मोड अभी "जल्द" है।
- क्लिनिक admin: Settings → "आम लोगों की डॉक्टर लिस्ट में दिखें"।

### Google Places key (वैकल्पिक, बिलिंग कार्ड चाहिए)
1. console.cloud.google.com → नया प्रोजेक्ट → Billing जोड़ें → "Places API (New)" Enable करें।
2. Credentials → API key → Restrict: सिर्फ़ "Places API (New)"।
3. **Quotas** में Text Search और Place Details की रोज़ की सीमा लगाएँ (जैसे 150/दिन और 30/दिन) ताकि बिल मुफ़्त सीमा से ऊपर न जाए। Budgets & alerts में ₹100 का alert भी लगाएँ।
4. Netlify में `GOOGLE_PLACES_API_KEY` डालें → Trigger deploy।

खर्च का डिज़ाइन: लिस्ट में सिर्फ़ नाम/पता/Maps लिंक (Text Search Pro, हर महीने मुफ़्त कोटा), फोन नंबर सिर्फ़ तब लिया जाता है जब कोई "नंबर देखें" दबाए (Enterprise field)। Google की शर्तों के कारण यह डेटा हमारे डेटाबेस में सेव नहीं होता।
