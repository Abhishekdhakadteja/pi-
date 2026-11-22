// Privacy Policy and Terms of Use, in Hindi and English, shown on /privacy and /terms.
// Written for India's Digital Personal Data Protection Act, 2023 (DPDP Act):
//  - the CLINIC decides why patient data is collected, so the clinic is the "Data Fiduciary";
//  - Clinic Easy stores and processes it on the clinic's behalf, so it is the "Data Processor";
//  - for doctors' own sign-up details, Clinic Easy itself is the Data Fiduciary.
// Keep both languages saying the same thing. Change LEGAL_UPDATED when the meaning changes.

import type { Lang } from "./i18n";

export const LEGAL_UPDATED = "2026-11-22";

export type LegalSection = { h: string; p?: string; items?: string[] };
export type LegalDoc = { title: string; updatedLabel: string; intro: string; sections: LegalSection[] };

const privacy: Record<Lang, LegalDoc> = {
  hi: {
    title: "Privacy Policy (गोपनीयता नीति)",
    updatedLabel: "आख़िरी बदलाव",
    intro:
      "Clinic Easy छोटे clinics के लिए software है। मरीज़ों का data clinic का होता है; हम उसे सिर्फ़ clinic के कहने पर, clinic का काम चलाने के लिए रखते और इस्तेमाल करते हैं। यह नीति बताती है कि कौन-सा data, क्यों, कहाँ और कब तक रखा जाता है, और आपके क्या अधिकार हैं।",
    sections: [
      {
        h: "1. कौन ज़िम्मेदार है",
        items: [
          "मरीज़ का data: जिस clinic में आप जाते हैं, वही clinic \"Data Fiduciary\" है (DPDP Act 2023)। Clinic Easy उसका \"Data Processor\" है।",
          "Doctor / staff का sign-up data: इसके लिए Clinic Easy (Teja Anna Automation) ख़ुद ज़िम्मेदार है।",
        ],
      },
      {
        h: "2. कौन-सा data रखा जाता है",
        items: [
          "मरीज़: नाम, mobile number, उम्र, लिंग, इलाक़ा, तकलीफ़, visit, डॉक्टर के notes, पर्ची (दवाइयाँ), fee, appointment और reminder का रिकॉर्ड।",
          "Doctor / staff: नाम, mobile, email, clinic का नाम और शहर, registration number (अगर दिया), login का समय।",
          "Technical: login session के cookies, और गड़बड़ी पकड़ने के लिए error का छोटा रिकॉर्ड (इसमें मरीज़ का नाम या फ़ोन नहीं जाता)।",
          "हम Aadhaar number नहीं माँगते और आवाज़ (voice) record करके नहीं रखते; बोलकर भरने पर सिर्फ़ लिखा हुआ text save होता है।",
        ],
      },
      {
        h: "3. data किस काम में आता है",
        items: [
          "Appointment, token, queue और clinic का रोज़ का काम।",
          "Appointment और follow-up के reminders (SMS / WhatsApp), सिर्फ़ तब जब मरीज़ ने सहमति दी हो।",
          "Doctor के लिए पुराना रिकॉर्ड, पर्ची, fee का हिसाब और reports।",
          "Pro plan में AI सारांश: AI को सिर्फ़ उम्र, लिंग, तकलीफ़, पिछली visits और दवाइयाँ भेजी जाती हैं; नाम और फ़ोन नहीं।",
          "हम data बेचते नहीं, विज्ञापन के लिए इस्तेमाल नहीं करते, और किसी दूसरे clinic को नहीं दिखाते।",
        ],
      },
      {
        h: "4. data कहाँ रहता है और किसके साथ बँटता है",
        items: [
          "Database: Supabase, Mumbai (भारत) region में। हर clinic का data अलग रहता है (Row Level Security)।",
          "Website hosting: Netlify (और ज़रूरत पड़ने पर Cloudflare)।",
          "SMS / WhatsApp भेजने वाली कंपनियाँ (जैसे MSG91, WhatsApp Business): सिर्फ़ फ़ोन number और message।",
          "AI (Anthropic Claude): सिर्फ़ Pro clinics में, ऊपर लिखे बिना नाम-फ़ोन वाले data के साथ। यह सेवा भारत के बाहर चलती है।",
          "Online payment (Razorpay): सिर्फ़ subscription का भुगतान; card / UPI की जानकारी हम नहीं रखते।",
          "क़ानूनी आदेश (court, सरकार) होने पर ही किसी और को data दिया जा सकता है।",
        ],
      },
      {
        h: "5. सुरक्षा",
        items: [
          "Password से login, हर role (attender, doctor, admin) को सिर्फ़ उतना दिखता है जितना ज़रूरी है।",
          "सारा data HTTPS से जाता है। Database का backup दिन में 2 बार, password से encrypt होकर बनता है।",
          "कोई गड़बड़ी (data breach) होने पर हम clinic को और ज़रूरत हो तो Data Protection Board को बताएँगे।",
        ],
      },
      {
        h: "6. data कब तक रहता है",
        items: [
          "जब तक clinic Clinic Easy इस्तेमाल करता है, उसका data रहता है, क्योंकि इलाज का रिकॉर्ड रखना ज़रूरी है।",
          "Clinic account बंद करवाए तो 30 दिन के अंदर data मिटा दिया जाता है (पहले clinic चाहे तो Excel में download कर ले)।",
          "Backup की copies 30 दिन बाद अपने आप हट जाती हैं।",
        ],
      },
      {
        h: "7. आपके अधिकार (DPDP Act 2023)",
        items: [
          "अपना data देखना, ग़लत हो तो सुधरवाना, या मिटवाना।",
          "Reminder बंद करवाना: clinic को बोलें, या नीचे दिए नंबर पर WhatsApp करें। सहमति कभी भी वापस ली जा सकती है।",
          "किसी अपने को nominate करना, जो आपकी तरफ़ से ये अधिकार इस्तेमाल करे।",
          "शिकायत: पहले अपने clinic से, फिर हमारे Grievance Officer से। जवाब से संतुष्ट न हों तो Data Protection Board of India में शिकायत कर सकते हैं।",
        ],
      },
      {
        h: "8. बच्चे",
        p: "18 साल से कम उम्र के मरीज़ का रिकॉर्ड माता-पिता या अभिभावक की सहमति से ही बनता है (आम तौर पर उनके mobile number पर, परिवार के सदस्य के रूप में)।",
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updatedLabel: "Last updated",
    intro:
      "Clinic Easy is software for small clinics. Patient data belongs to the clinic; we store and use it only on the clinic's instructions, to run the clinic. This policy explains what data is kept, why, where, for how long, and what your rights are.",
    sections: [
      {
        h: "1. Who is responsible",
        items: [
          "Patient data: the clinic you visit is the \"Data Fiduciary\" (DPDP Act 2023). Clinic Easy is its \"Data Processor\".",
          "Doctor / staff sign-up data: Clinic Easy (Teja Anna Automation) is responsible for it.",
        ],
      },
      {
        h: "2. What data is kept",
        items: [
          "Patients: name, mobile number, age, gender, area, complaint, visits, doctor's notes, prescriptions, fees, appointment and reminder records.",
          "Doctors / staff: name, mobile, email, clinic name and city, registration number (if given), login times.",
          "Technical: login session cookies, and a short error record to catch faults (it never includes a patient's name or phone).",
          "We do not ask for Aadhaar numbers and we do not record or store voice; when you fill a form by speaking, only the written text is saved.",
        ],
      },
      {
        h: "3. What the data is used for",
        items: [
          "Appointments, tokens, the queue and the clinic's daily work.",
          "Appointment and follow-up reminders (SMS / WhatsApp), only when the patient has agreed.",
          "Past records, prescriptions, fee accounts and reports for the doctor.",
          "AI summary on the Pro plan: the AI receives only age, gender, complaint, past visits and medicines; never the name or phone.",
          "We never sell data, never use it for advertising, and never show it to another clinic.",
        ],
      },
      {
        h: "4. Where data lives and who it is shared with",
        items: [
          "Database: Supabase, Mumbai (India) region. Each clinic's data is kept apart (Row Level Security).",
          "Website hosting: Netlify (and Cloudflare when needed).",
          "SMS / WhatsApp providers (such as MSG91, WhatsApp Business): only the phone number and the message.",
          "AI (Anthropic Claude): only for Pro clinics, with the name- and phone-free data above. This service runs outside India.",
          "Online payments (Razorpay): only subscription payments; we never store card or UPI details.",
          "Data is given to anyone else only on a legal order (court or government).",
        ],
      },
      {
        h: "5. Security",
        items: [
          "Password login; each role (attender, doctor, admin) sees only what it needs.",
          "All traffic uses HTTPS. The database is backed up twice a day, encrypted with a password.",
          "If a data breach happens we will inform the clinic and, where required, the Data Protection Board.",
        ],
      },
      {
        h: "6. How long data is kept",
        items: [
          "A clinic's data is kept while the clinic uses Clinic Easy, because treatment records must be kept.",
          "If a clinic closes its account, its data is deleted within 30 days (the clinic can first download it in Excel).",
          "Backup copies are removed automatically after 30 days.",
        ],
      },
      {
        h: "7. Your rights (DPDP Act 2023)",
        items: [
          "See your data, have it corrected, or have it erased.",
          "Stop reminders: tell the clinic, or WhatsApp the number below. Consent can be withdrawn at any time.",
          "Nominate someone to use these rights on your behalf.",
          "Complaints: first to your clinic, then to our Grievance Officer. If you are not satisfied you can complain to the Data Protection Board of India.",
        ],
      },
      {
        h: "8. Children",
        p: "A record for a patient under 18 is made only with a parent's or guardian's consent (usually on their mobile number, as a family member).",
      },
    ],
  },
};

const terms: Record<Lang, LegalDoc> = {
  hi: {
    title: "Terms of Use (इस्तेमाल की शर्तें)",
    updatedLabel: "आख़िरी बदलाव",
    intro:
      "Clinic Easy इस्तेमाल करके doctor / clinic इन शर्तों को मानते हैं। Clinic Easy, Teja Anna Automation (Teja Anna Group, भारत) की सेवा है।",
    sections: [
      {
        h: "1. सेवा क्या है",
        p: "Appointment, queue, मरीज़ का रिकॉर्ड, पर्ची, fee का हिसाब, reminders और AI मदद वाला clinic software। यह डॉक्टर की मदद का औज़ार है; इलाज का हर फ़ैसला डॉक्टर का अपना है।",
      },
      {
        h: "2. Clinic की ज़िम्मेदारियाँ (Data Processing Agreement)",
        items: [
          "Clinic मरीज़ के data का Data Fiduciary है: मरीज़ से सहमति लेना, उसकी माँग पर data सुधारना या मिटाना clinic की ज़िम्मेदारी है। App में सहमति का box इसी के लिए है।",
          "Clinic Easy, Data Processor के रूप में, data सिर्फ़ clinic का काम चलाने के लिए इस्तेमाल करेगा, उसे सुरक्षित रखेगा, और breach होने पर clinic को बिना देर बताएगा।",
          "Staff के login और password सँभालना clinic का काम है। कोई staff छोड़ दे तो admin उसका login तुरंत हटाए।",
          "Clinic ग़लत, किसी और का, या बिना सहमति का data नहीं डालेगा।",
        ],
      },
      {
        h: "3. AI और voice",
        items: [
          "AI सारांश और AI मैनेजर सिर्फ़ मदद हैं; ये diagnosis नहीं करते और दवा नहीं सुझाते। AI ग़लत भी हो सकता है, इसलिए डॉक्टर हर बात ख़ुद जाँचें।",
          "बोलकर भरे गए text को save करने से पहले देखना ज़रूरी है।",
        ],
      },
      {
        h: "4. भुगतान और plan",
        items: [
          "Plans और कीमतें /pricing page पर लिखी हैं। Subscription हर महीने पहले से (advance) लिया जाता है।",
          "Plan बंद करने पर अगले महीने से पैसा नहीं कटेगा; चल रहे महीने का पैसा वापस नहीं होता, जब तक क़ानून न कहे।",
          "Free / trial plan में सीमाएँ हो सकती हैं, जो app में दिखाई जाती हैं।",
        ],
      },
      {
        h: "5. सेवा की उपलब्धता",
        items: [
          "हम app को हर समय चालू रखने की पूरी कोशिश करते हैं (रोज़ backup, हर 30 मिनट जाँच), पर internet, hosting या किसी बाहरी सेवा की ख़राबी से कभी-कभी रुकावट आ सकती है।",
          "ज़रूरी काम के लिए clinic आज की list print या download करके रखे।",
        ],
      },
      {
        h: "6. ज़िम्मेदारी की सीमा",
        p: "क़ानून जितना अनुमति देता है, उस हद तक: इलाज के फ़ैसलों, या app में डाली गई ग़लत जानकारी से हुए नुक़सान के लिए Clinic Easy ज़िम्मेदार नहीं है। किसी भी दावे में हमारी ज़िम्मेदारी, पिछले 3 महीनों में clinic ने जितना भुगतान किया, उससे ज़्यादा नहीं होगी।",
      },
      {
        h: "7. Account बंद करना",
        items: [
          "Clinic कभी भी account बंद करवा सकता है; बंद करने से पहले अपना data Excel में download कर ले। 30 दिन बाद data मिटा दिया जाता है।",
          "ग़लत इस्तेमाल (spam messages, दूसरों का data, धोखाधड़ी) पर हम account रोक सकते हैं।",
        ],
      },
      {
        h: "8. क़ानून और विवाद",
        p: "ये शर्तें भारत के क़ानून के तहत हैं। विवाद पहले बातचीत से सुलझाने की कोशिश होगी। शर्तें बदलने पर यह page update होगा और बड़ा बदलाव app में बताया जाएगा।",
      },
    ],
  },
  en: {
    title: "Terms of Use",
    updatedLabel: "Last updated",
    intro:
      "By using Clinic Easy, the doctor / clinic agrees to these terms. Clinic Easy is a service of Teja Anna Automation (Teja Anna Group, India).",
    sections: [
      {
        h: "1. The service",
        p: "Clinic software for appointments, the queue, patient records, prescriptions, fee accounts, reminders and AI help. It is a tool that helps the doctor; every treatment decision is the doctor's own.",
      },
      {
        h: "2. Clinic responsibilities (Data Processing Agreement)",
        items: [
          "The clinic is the Data Fiduciary for patient data: taking patient consent, and correcting or erasing data on the patient's request, is the clinic's duty. The consent box in the app exists for this.",
          "Clinic Easy, as Data Processor, uses the data only to run the clinic's work, keeps it secure, and informs the clinic without delay if a breach happens.",
          "The clinic looks after its staff logins and passwords. When a staff member leaves, the admin removes their login at once.",
          "The clinic will not enter false data, someone else's data, or data without consent.",
        ],
      },
      {
        h: "3. AI and voice",
        items: [
          "The AI summary and AI manager only assist; they do not diagnose and do not suggest medicines. AI can be wrong, so the doctor checks everything.",
          "Text filled in by speaking must be checked before it is saved.",
        ],
      },
      {
        h: "4. Payments and plans",
        items: [
          "Plans and prices are listed on the /pricing page. Subscriptions are charged monthly in advance.",
          "After cancelling, no further months are charged; the current month is not refunded unless the law requires it.",
          "Free / trial plans may have limits, which are shown in the app.",
        ],
      },
      {
        h: "5. Availability",
        items: [
          "We work hard to keep the app running at all times (daily backups, a check every 30 minutes), but faults in the internet, hosting or an outside service can occasionally cause interruptions.",
          "For essential work the clinic should print or download today's list.",
        ],
      },
      {
        h: "6. Limitation of liability",
        p: "To the extent the law allows: Clinic Easy is not liable for treatment decisions, or for loss caused by wrong information entered in the app. Our liability for any claim will not exceed what the clinic paid in the previous 3 months.",
      },
      {
        h: "7. Closing an account",
        items: [
          "A clinic can close its account at any time; download your data in Excel first. Data is deleted after 30 days.",
          "We may suspend an account for misuse (spam messages, other people's data, fraud).",
        ],
      },
      {
        h: "8. Law and disputes",
        p: "These terms follow the laws of India. Disputes will first be settled by discussion. When the terms change this page is updated, and big changes are announced in the app.",
      },
    ],
  },
};

export function getLegal(kind: "privacy" | "terms", lang: Lang): LegalDoc {
  return (kind === "privacy" ? privacy : terms)[lang];
}

/** Heading of the Grievance Officer box (DPDP Act 2023 asks for a named contact). */
export const GRIEVANCE_TITLE: Record<Lang, string> = {
  hi: "Grievance Officer (शिकायत अधिकारी)",
  en: "Grievance Officer",
};
